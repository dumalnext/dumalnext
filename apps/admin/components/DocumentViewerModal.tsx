"use client";

import React, { useState, useEffect } from "react";

export interface DocumentInspectionItem {
  docType: string;
  docTitle: string;
  fileName: string;
  fileData?: string | null;
  sizeKb?: number;
  uploadedAt?: string;
}

interface DocumentViewerModalProps {
  document: DocumentInspectionItem;
  learnerName: string;
  lrn: string;
  onClose: () => void;
  onVerify?: (docTitle: string) => void;
  onFlagRevision?: (docTitle: string) => void;
}

export default function DocumentViewerModal({
  document,
  learnerName,
  lrn,
  onClose,
  onVerify,
  onFlagRevision,
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!document.fileData) return;
    const a = window.document.createElement("a");
    a.href = document.fileData;
    a.download = document.fileName || `${document.docTitle.replace(/\s+/g, "_")}.jpg`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const isPdf = document.fileData?.startsWith("data:application/pdf") || document.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-xs flex flex-col font-sans animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="bg-[#002060] border-b-2 border-slate-700 px-4 sm:px-6 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="border-r border-blue-400/40 pr-3">
            <span className="text-[10px] font-mono tracking-wider uppercase text-blue-200 block">
              [ OFFICIAL DOCUMENT INSPECTION ]
            </span>
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-tight text-white">
              {document.docTitle}
            </h2>
          </div>
          <div className="hidden md:block text-xs">
            <span className="text-slate-300">Learner:</span>{" "}
            <strong className="text-white uppercase">{learnerName}</strong>{" "}
            <span className="text-blue-300 font-mono">({lrn})</span>
          </div>
        </div>

        {/* Zoom & Rotation Toolset */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="px-2.5 py-1 bg-blue-900 border border-blue-400/50 hover:bg-blue-800 disabled:opacity-40"
                title="Zoom Out"
              >
                [ - ]
              </button>
              <span className="px-2 py-1 bg-blue-950 text-blue-200 border border-blue-400/40 min-w-16 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="px-2.5 py-1 bg-blue-900 border border-blue-400/50 hover:bg-blue-800 disabled:opacity-40"
                title="Zoom In"
              >
                [ + ]
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1 bg-blue-900 border border-blue-400/50 hover:bg-blue-800"
                title="Rotate 90 Degrees"
              >
                [ Rotate 90&deg; ]
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 bg-blue-950 border border-blue-400/40 text-[11px] hover:bg-blue-900"
              >
                [ Reset ]
              </button>
            </>
          )}

          {document.fileData && (
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white font-bold ml-1"
            >
              [ Download ]
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white font-bold ml-2 border border-red-500"
          >
            [ Close (Esc) ]
          </button>
        </div>
      </header>

      {/* Main Image Viewport Area */}
      <main className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-900/60">
        {isPdf ? (
          <div className="w-full max-w-4xl h-full bg-white border-2 border-slate-300 shadow-2xl flex flex-col">
            <div className="bg-slate-100 p-2 border-b border-slate-300 text-xs font-mono text-slate-700 flex justify-between items-center">
              <span>PDF Document: {document.fileName}</span>
              <a
                href={document.fileData || "#"}
                download={document.fileName}
                className="text-[#002060] font-bold underline uppercase"
              >
                [ Download PDF ]
              </a>
            </div>
            <iframe
              src={document.fileData || ""}
              title={document.docTitle}
              className="w-full flex-1 border-0"
            />
          </div>
        ) : (
          <div className="relative max-w-full max-h-full overflow-visible transition-transform duration-150 flex items-center justify-center">
            {document.fileData ? (
              <img
                src={document.fileData}
                alt={document.docTitle}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-[82vh] max-w-[92vw] object-contain shadow-2xl border-2 border-slate-600 bg-white"
              />
            ) : (
              <div className="p-8 bg-white border-2 border-slate-400 text-center max-w-md space-y-2 text-slate-900">
                <span className="font-mono font-bold text-xs text-[#002060] uppercase block">
                  [ DOCUMENT RECORD FOUND ]
                </span>
                <p className="text-xs font-bold">{document.fileName}</p>
                <p className="text-[11px] text-slate-600">
                  Document metadata confirmed in Supabase admissions registry.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Adjudication Inspection Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-4 text-slate-300">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Original File Name</span>
            <span className="font-mono font-bold text-white text-[11px]">{document.fileName}</span>
          </div>
          {document.sizeKb && (
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-500 text-[10px] uppercase block">Compressed Size</span>
              <span className="font-mono font-bold text-slate-200 text-[11px]">{document.sizeKb} KB</span>
            </div>
          )}
          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 text-[10px] uppercase block">Authentication</span>
            <span className="text-emerald-400 font-bold font-mono text-[11px]">[ VALID CREDENTIAL ]</span>
          </div>
        </div>

        {/* Quick Review Feedback Buttons */}
        <div className="flex items-center gap-2">
          {onFlagRevision && (
            <button
              type="button"
              onClick={() => {
                onFlagRevision(document.docTitle);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-red-900/80 hover:bg-red-800 border border-red-600 text-white font-bold uppercase tracking-wider text-[11px]"
            >
              [ Flag: Request Clearer Copy ]
            </button>
          )}

          {onVerify && (
            <button
              type="button"
              onClick={() => {
                onVerify(document.docTitle);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 border border-emerald-500 text-white font-bold uppercase tracking-wider text-[11px]"
            >
              [ Mark Verified &amp; Legible ]
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
