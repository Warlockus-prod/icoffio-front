/**
 * VERCEL DEPLOYMENT WEBHOOK
 * 
 * Receives deployment status from Vercel
 * Sends notifications to Telegram on build errors
 * 
 * Setup in Vercel:
 * 1. Settings → Git → Deploy Hooks
 * 2. Add webhook: https://app.icoffio.com/api/vercel-webhook
 * 3. Or Settings → Integrations → Webhooks
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface VercelWebhookPayload {
  type: string; // 'deployment' | 'deployment-ready' | 'deployment-error'
  payload: {
    deployment: {
      id: string;
      url: string;
      name: string;
      meta: {
        githubCommitMessage?: string;
        githubCommitSha?: string;
        githubCommitAuthorName?: string;
      };
    };
    project: {
      name: string;
    };
    team?: {
      name: string;
    };
  };
}

async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('[Vercel Webhook] Telegram credentials not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
  } catch (error) {
    console.error('[Vercel Webhook] Failed to send Telegram notification:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VercelWebhookPayload = await request.json();
    
    console.log('[Vercel Webhook] Received:', body.type);

    const { type, payload } = body;
    const { deployment, project } = payload;
    
    const commitMessage = deployment.meta.githubCommitMessage || 'No commit message';
    const commitSha = deployment.meta.githubCommitSha || 'unknown';
    const author = deployment.meta.githubCommitAuthorName || 'unknown';
    const shortSha = commitSha.substring(0, 7);

    // Handle deployment error
    if (type === 'deployment-error') {
      console.error('[Vercel Webhook] Deployment failed:', deployment.id);
      
      await sendTelegramNotification(
        `🚨 <b>VERCEL BUILD FAILED!</b>\n\n` +
        `<b>Project:</b> ${project.name}\n` +
        `<b>Commit:</b> ${commitMessage}\n` +
        `<b>Author:</b> ${author}\n` +
        `<b>SHA:</b> <code>${shortSha}</code>\n\n` +
        `⚠️ <b>Action Required:</b>\n` +
        `1. Check build logs in Vercel\n` +
        `2. Fix TypeScript/build errors\n` +
        `3. Push fix to GitHub\n\n` +
        `🔗 <a href="https://vercel.com/dashboard">View Logs</a>\n` +
        `📝 <a href="https://github.com/Warlockus-prod/icoffio-front/commit/${commitSha}">View Commit</a>`
      );
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Error notification sent' 
      });
    }

    // Handle successful deployment
    if (type === 'deployment-ready') {
      console.log('[Vercel Webhook] Deployment successful:', deployment.id);
      
      await sendTelegramNotification(
        `✅ <b>Vercel Deploy SUCCESS</b>\n\n` +
        `<b>Project:</b> ${project.name}\n` +
        `<b>Commit:</b> ${commitMessage}\n` +
        `<b>Author:</b> ${author}\n` +
        `<b>SHA:</b> <code>${shortSha}</code>\n\n` +
        `🌐 <a href="https://app.icoffio.com">app.icoffio.com</a>\n` +
        `📊 <a href="https://vercel.com/dashboard">Vercel Dashboard</a>`
      );
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Success notification sent' 
      });
    }

    // Other webhook types (deployment-started, etc.)
    return NextResponse.json({ 
      ok: true, 
      message: `Webhook received: ${type}` 
    });

  } catch (error: any) {
    console.error('[Vercel Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/vercel-webhook',
    description: 'Vercel deployment webhook receiver',
    telegram_configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  });
}


