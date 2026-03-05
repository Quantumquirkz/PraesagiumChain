"use client";

import { useState } from "react";
import { ShieldCheck, ExternalLink, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModelVerifierProps {
  modelVersion?: string | null;
  modelHash?: string | null;
  className?: string;
}

const REPO_URL = "https://github.com/quantumquirkz/PraesagiumChain";

export function ModelVerifier({ modelVersion, modelHash, className }: ModelVerifierProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!modelVersion && !modelHash) return null;

  const shortHash = modelHash ? modelHash.slice(0, 8) : null;

  const handleCopy = async () => {
    if (!modelHash) return;
    await navigator.clipboard.writeText(modelHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border border-border bg-elevated px-3 py-2",
          className
        )}
      >
        <ShieldCheck className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
        <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-xs">
          {modelVersion && (
            <span className="text-text-muted">
              Modelo:{" "}
              <span className="text-foreground">{modelVersion}</span>
            </span>
          )}
          {shortHash && (
            <span className="text-text-muted">
              Hash:{" "}
              <span className="text-cyan">{shortHash}…</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] text-cyan underline-offset-2 hover:underline focus:outline-none"
          aria-label="Verificar integridad del modelo"
        >
          Verificar ↗
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-surface">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <ShieldCheck className="h-5 w-5 text-cyan" />
              Verificador de Integridad del Modelo
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-text-secondary">
              El hash del modelo garantiza que la predicción fue generada por una versión
              específica e inmutable del motor PHPE. Puedes compararlo con el hash publicado
              en el repositorio oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {modelVersion && (
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  Versión del modelo
                </p>
                <p className="font-mono text-sm text-foreground">{modelVersion}</p>
              </div>
            )}

            {modelHash && (
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                  Hash SHA-256
                </p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2">
                  <code className="flex-1 break-all font-mono text-xs text-cyan">
                    {modelHash}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-text-muted hover:text-foreground transition-colors"
                    aria-label="Copiar hash"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-md border border-cyan/20 bg-cyan-dim/10 p-3 space-y-1">
              <p className="font-mono text-[11px] text-cyan uppercase tracking-widest">
                ¿Cómo verificar?
              </p>
              <ol className="font-body text-xs text-text-secondary space-y-1 list-decimal list-inside">
                <li>Copia el hash de arriba</li>
                <li>Abre el repositorio oficial del proyecto</li>
                <li>Busca el archivo <code className="text-cyan">model_hash.txt</code> en la versión correspondiente</li>
                <li>Compara que ambos hashes sean idénticos</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 border-border font-mono text-xs"
                onClick={() => window.open(`${REPO_URL}/releases`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver en repositorio
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-cyan text-black hover:bg-cyan/90 border-0 font-mono text-xs"
                onClick={() => setOpen(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
