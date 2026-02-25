/**
 * ADMIN ENDPOINT: Manage feedback reports
 *
 * GET  — List feedback (with filters, search, pagination, stats)
 * PATCH — Update status, priority, admin notes
 * DELETE — Remove feedback reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { createClient } from '@/lib/pg-client';

export const runtime = 'nodejs';

/**
 * GET /api/admin/feedback
 * Query params: status, category, priority, search, page, per_page, stats_only
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'viewer', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const statsOnly = searchParams.get('stats_only') === 'true';
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));

    const supabase = createClient();

    // Stats mode — return aggregate counts
    if (statsOnly) {
      const { data: allReports, error } = await supabase
        .from('feedback_reports')
        .select('id, status, category, priority, created_at');

      if (error) throw error;

      const reports = (allReports || []) as Array<{ id: number; status: string; category: string; priority: string; created_at: string }>;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: reports.length,
        new: reports.filter(r => r.status === 'new').length,
        in_progress: reports.filter(r => r.status === 'in_progress').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length,
        new_this_week: reports.filter(r => new Date(r.created_at) >= weekAgo).length,
        by_category: {
          bug: reports.filter(r => r.category === 'bug').length,
          ui_issue: reports.filter(r => r.category === 'ui_issue').length,
          content_error: reports.filter(r => r.category === 'content_error').length,
          feature_request: reports.filter(r => r.category === 'feature_request').length,
          other: reports.filter(r => r.category === 'other').length,
        },
        critical: reports.filter(r => r.priority === 'critical' && r.status !== 'resolved' && r.status !== 'dismissed').length,
      };

      return NextResponse.json({ success: true, stats });
    }

    // List mode — return paginated feedback
    let query = supabase
      .from('feedback_reports')
      .select('*');

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (priority) query = query.eq('priority', priority);
    if (search) query = query.ilike('description', `%${search}%`);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (error) throw error;

    // Simple offset-based pagination via post-filter
    // (pg-query-builder doesn't support .range(), so we use limit + offset manually)
    const offset = (page - 1) * perPage;
    const paginatedData = (data || []).slice(offset, offset + perPage);

    // Get total count for pagination
    let countQuery = supabase
      .from('feedback_reports')
      .select('id');
    if (status) countQuery = countQuery.eq('status', status);
    if (category) countQuery = countQuery.eq('category', category);
    if (priority) countQuery = countQuery.eq('priority', priority);
    if (search) countQuery = countQuery.ilike('description', `%${search}%`);

    const { data: countData } = await countQuery;
    const totalCount = countData?.length || 0;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        total_pages: Math.ceil(totalCount / perPage),
      },
    });
  } catch (error) {
    console.error('[Admin Feedback] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/feedback
 * Body: { id, status?, priority?, admin_notes? }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, status, priority, admin_notes } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (status) {
      const validStatuses = ['new', 'in_progress', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json(
          { success: false, error: `Invalid priority. Must be: ${validPriorities.join(', ')}` },
          { status: 400 }
        );
      }
      updates.priority = priority;
    }
    if (admin_notes !== undefined) {
      updates.admin_notes = (admin_notes || '').substring(0, 5000);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('feedback_reports')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    console.log(`[Admin Feedback] Updated #${id}:`, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Feedback] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update feedback' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feedback
 * Body: { id } or { ids: number[] }
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { id, ids } = body;

    const supabase = createClient();

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Bulk delete
      for (const feedbackId of ids) {
        await supabase.from('feedback_reports').delete().eq('id', feedbackId);
      }
      console.log(`[Admin Feedback] Bulk deleted ${ids.length} reports`);
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (id && typeof id === 'number') {
      const { error } = await supabase.from('feedback_reports').delete().eq('id', id);
      if (error) throw error;
      console.log(`[Admin Feedback] Deleted #${id}`);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'ID or IDs array required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin Feedback] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete feedback' },
      { status: 500 }
    );
  }
}
