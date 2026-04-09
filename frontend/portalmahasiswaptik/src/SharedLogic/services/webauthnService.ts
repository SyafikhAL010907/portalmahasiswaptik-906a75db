/**
 * WebAuthn Service for Passwordless Biometric Authentication (FaceID/Fingerprint)
 * Handles binary conversion and navigator.credentials interactions.
 */

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Helper to convert Base64 URL to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper to convert ArrayBuffer to Base64 URL
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export const webauthnService = {
  /**
   * Check if the device supports WebAuthn and platform biometrics
   */
  async isSupported(): Promise<boolean> {
    return (
      window.PublicKeyCredential &&
      (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  },

  /**
   * Register a new biometric credential (FaceID/Fingerprint)
   */
  async register(userId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Lo belum login bro! Token tidak ditemukan.");

      // 1. Get creation options from backend
      const response = await fetch("/api/auth/webauthn/register/begin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const options = await response.json();

      if (options.error) throw new Error(options.error);

      // 2. Prepare options for navigator.credentials.create
      // Convert challenge and user.id to ArrayBuffer
      options.publicKey.challenge = base64ToBuffer(options.publicKey.challenge);
      options.publicKey.user.id = base64ToBuffer(options.publicKey.user.id);

      if (options.publicKey.excludeCredentials) {
        options.publicKey.excludeCredentials = options.publicKey.excludeCredentials.map((c: any) => ({
          ...c,
          id: base64ToBuffer(c.id),
        }));
      }

      // 3. Trigger Biometric Prompt
      const credential = (await navigator.credentials.create({
        publicKey: options.publicKey,
      })) as PublicKeyCredential;

      if (!credential) throw new Error("Gagal membuat credential. Silakan coba lagi.");

      // 4. Prepare response for backend
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      const body = {
        id: credential.id,
        rawId: bufferToBase64(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: bufferToBase64(attestationResponse.attestationObject),
          clientDataJSON: bufferToBase64(attestationResponse.clientDataJSON),
        },
      };

      // 5. Submit to backend
      const finishResponse = await fetch("/api/auth/webauthn/register/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await finishResponse.json();
      if (result.success) {
        toast.success("Biometrik Berhasil Didaftarkan! 🦾");
        return true;
      } else {
        throw new Error(result.error || "Gagal menyimpan biometrik.");
      }
    } catch (err: any) {
      console.error("WebAuthn Register Error:", err);
      toast.error(err.message || "Gagal mendaftarkan biometrik.");
      return false;
    }
  },

  /**
   * Authenticate with biometrics (FaceID/Fingerprint)
   * If nim is provided, it attempts a passwordless LOGIN.
   * If nim is NOT provided, it attempts a 2FA challenge for a logged-on user (Attendance).
   */
  async authenticate(nim?: string): Promise<{ success: boolean; token?: string; user?: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Get request options from backend
      // If NIM is provided, we hit the public endpoint via POST.
      // Otherwise, we hit the protected endpoint via GET.
      const beginUrl = "/api/auth/webauthn/login/begin";
      
      const headers: any = { "Content-Type": "application/json" };
      if (!nim && session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const beginOptions: RequestInit = nim 
        ? { 
            method: "POST", 
            headers,
            body: JSON.stringify({ nim })
          }
        : { 
            headers 
          };

      const response = await fetch(beginUrl, beginOptions);
      const options = await response.json();

      if (options.error) throw new Error(options.error);

      // 2. Prepare options for navigator.credentials.get
      options.publicKey.challenge = base64ToBuffer(options.publicKey.challenge);
      if (options.publicKey.allowCredentials) {
        options.publicKey.allowCredentials = options.publicKey.allowCredentials.map((c: any) => ({
          ...c,
          id: base64ToBuffer(c.id),
        }));
      }

      // 3. Trigger Biometric Prompt (Fallbacks to PIN automatically by OS)
      const assertion = (await navigator.credentials.get({
        publicKey: options.publicKey,
      })) as PublicKeyCredential;

      if (!assertion) throw new Error("Gagal verifikasi biometrik.");

      // 4. Prepare response for backend
      const authResponse = assertion.response as AuthenticatorAssertionResponse;
      const body: any = {
        id: assertion.id,
        rawId: bufferToBase64(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: bufferToBase64(authResponse.authenticatorData),
          clientDataJSON: bufferToBase64(authResponse.clientDataJSON),
          signature: bufferToBase64(authResponse.signature),
          userHandle: authResponse.userHandle ? bufferToBase64(authResponse.userHandle) : null,
        },
      };

      // If logging in, send the NIM back to identify the session
      if (nim) body.nim = nim;

      // 5. Submit to backend
      headers["Content-Type"] = "application/json";
      if (!nim && session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const finishResponse = await fetch("/api/auth/webauthn/login/finish", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const result = await finishResponse.json();
      if (result.success) {
        return { 
          success: true, 
          token: result.token, // Will be present for Login flow
          user: result.user 
        };
      } else {
        throw new Error(result.error || "Verifikasi biometrik gagal.");
      }
    } catch (err: any) {
      console.error("WebAuthn Auth Error:", err);
      // Don't show toast for 2FA as the hook handles its own UI
      if (nim) toast.error(err.message || "Gagal login biometrik.");
      return { success: false };
    }
  },
};
