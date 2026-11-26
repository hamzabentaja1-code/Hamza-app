export type ProductVoiceTarget = 'search' | 'name' | 'price' | 'quantity';
export type VoiceSession = {target: ProductVoiceTarget; phase: 'preparing' | 'native' | 'stopping' | 'cancelled'};

/** One target owns the recognizer until the native end event. Permission callbacks keep the original token. */
export class ProductVoiceSession {
  current?: VoiceSession;

  begin(target: ProductVoiceTarget): VoiceSession | undefined {
    if (this.current) return;
    return this.current = {target, phase: 'preparing'};
  }

  start(session: VoiceSession): boolean {
    if (this.current !== session || session.phase !== 'preparing') return false;
    session.phase = 'native';
    return true;
  }

  stop(target: ProductVoiceTarget): boolean {
    const session = this.current;
    if (!session || session.target !== target || session.phase !== 'native') return false;
    session.phase = 'stopping';
    return true;
  }

  cancel(target?: ProductVoiceTarget): boolean {
    const session = this.current;
    if (!session || (target && target !== session.target) || session.phase === 'cancelled') return false;
    if (session.phase === 'preparing') { this.current = undefined; return false; }
    session.phase = 'cancelled';
    return true;
  }

  finish(session = this.current): boolean {
    if (!session || this.current !== session) return false;
    this.current = undefined;
    return true;
  }

  resultTarget(): ProductVoiceTarget | undefined {
    const session = this.current;
    return session && (session.phase === 'native' || session.phase === 'stopping') ? session.target : undefined;
  }
}

export function productVoiceLocale(language: 'AR' | 'FR', installed: readonly string[]): string {
  const preferred = language === 'FR' ? 'fr-MA' : 'ar-MA';
  const normalized = installed.map(locale => locale.replace(/_/g,'-'));
  const lower = (value:string)=>value.toLowerCase();
  const exact = normalized.find(locale => lower(locale) === lower(preferred));
  if (exact) return exact;
  const base = lower(preferred).slice(0,2);
  const fallback = language === 'FR' ? 'fr-FR' : 'ar';
  return normalized.find(locale => lower(locale) === lower(fallback))
    ?? normalized.find(locale => lower(locale) === base || lower(locale).startsWith(base+'-'))
    ?? preferred;
}

/** Accept just one spoken numeric token; never extract a number from an ambiguous phrase. */
export function productVoiceValue(target: ProductVoiceTarget, transcript: string): string | undefined {
  const text = transcript.trim();
  if (!text) return;
  if (target === 'name' || target === 'search') return text.slice(0,240);
  const normalized = text.replace(/[٠-٩۰-۹]/g,digit=>String(digit.charCodeAt(0)-(digit <= '٩' ? 0x660 : 0x6f0)))
    .replace(/[٫,]/g,'.').replace(/\s*\.\s*/g,'.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) return;
  if (target === 'quantity' && !/^\d{1,9}$/.test(normalized)) return;
  return normalized;
}
