/**
 * TimestampDownloadLinks — download links for external verification.
 *
 * Provides downloads for a content hash file and .ots proof, plus a
 * link to opentimestamps.org. Implements the double-hash privacy
 * architecture where only a hash (not the original data) is uploaded
 * for external verification.
 *
 * No theme or i18n dependencies — style via className props.
 */

import React from 'react';

export interface TimestampData {
  /** SHA256 of the original data (64 hex characters). */
  contentHash: string;
  /** Base64-encoded .ots proof bytes. */
  otsProof: string;
  /** SHA256 of contentHash — shown in technical details if provided. */
  timestampHash?: string;
}

export interface TimestampDownloadLinksProps {
  /** Timestamp data to download. */
  timestamp: TimestampData;
  /** Prefix for downloaded filenames. */
  filenamePrefix?: string;
  /** Additional CSS class for the wrapper. */
  className?: string;
  /** Use compact layout (icons only). */
  compact?: boolean;
  /** Custom labels. */
  labels?: {
    hashFile?: string;
    proofFile?: string;
    verifyAt?: string;
    technicalDetails?: string;
    explanation?: string;
  };
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function downloadFile(content: string | Uint8Array, filename: string, mimeType = 'application/octet-stream') {
  const blob = new Blob([content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Simple download icon. */
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/** Simple external link icon. */
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function TimestampDownloadLinks({
  timestamp,
  filenamePrefix = 'timestamp',
  className = '',
  compact = false,
  labels = {},
}: TimestampDownloadLinksProps) {
  if (!timestamp?.contentHash || !timestamp?.otsProof) {
    return null;
  }

  const {
    hashFile = 'Hash file',
    proofFile = '.ots proof',
    verifyAt = 'Verify at',
    technicalDetails = 'Technical details',
    explanation = 'Download files below and verify at opentimestamps.org. No sensitive data is shared.',
  } = labels;

  const handleDownloadHash = () => {
    downloadFile(timestamp.contentHash, `${filenamePrefix}-hash.txt`, 'text/plain');
  };

  const handleDownloadProof = () => {
    const proofBytes = base64ToBytes(timestamp.otsProof);
    downloadFile(proofBytes, `${filenamePrefix}.ots`);
  };

  const handleOpenVerifier = () => {
    window.open('https://opentimestamps.org', '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <button onClick={handleDownloadHash} title="Download hash for verification" className="p-1 rounded">
          <DownloadIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleDownloadProof} title="Download .ots proof" className="p-1 rounded">
          <DownloadIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleOpenVerifier} title="Verify at opentimestamps.org" className="p-1 rounded">
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs text-gray-500">{explanation}</p>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleDownloadHash} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium">
          <DownloadIcon className="w-3 h-3" />
          {hashFile}
        </button>
        <button onClick={handleDownloadProof} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium">
          <DownloadIcon className="w-3 h-3" />
          {proofFile}
        </button>
      </div>

      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500">{verifyAt}</span>
        <button onClick={handleOpenVerifier} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
          opentimestamps.org
          <ExternalLinkIcon className="w-3 h-3" />
        </button>
      </div>

      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">{technicalDetails}</summary>
        <div className="mt-1 p-2 rounded font-mono text-[10px] break-all bg-gray-50">
          <div><span className="font-semibold">contentHash:</span> {timestamp.contentHash}</div>
          {timestamp.timestampHash && (
            <div className="mt-1"><span className="font-semibold">timestampHash:</span> {timestamp.timestampHash}</div>
          )}
        </div>
      </details>
    </div>
  );
}
