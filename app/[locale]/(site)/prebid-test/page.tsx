import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { isPrebidEnabled, resolveAdsProviderForHost } from '@/lib/ads-provider-core';
import { PrebidTestClient } from './PrebidTestClient';

/**
 * Bidio/Prebid diagnostics. Exists only on PREBID_HOSTS — icoffio.com and
 * app.icoffio.com must be exactly as they were, and a debug page that answers
 * 200 there is a soft 404 Google will happily index.
 *
 * The guard is a server component on purpose: notFound() from a client
 * component renders the not-found UI but leaves the status at 200.
 */
export default function PrebidTestPage() {
  const provider = resolveAdsProviderForHost(headers().get('host'));
  if (!isPrebidEnabled(provider)) notFound();

  return <PrebidTestClient />;
}
