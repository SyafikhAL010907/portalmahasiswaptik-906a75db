/**
 * WebAuthn Service for Passwordless Biometric Authentication (FaceID/Fingerprint)
 * Handles binary conversion and navigator.credentials interactions.
 */

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { API_BASE_URL } from "@/lib/constants";

// Helper to validate and parse JSON response
async function handleResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    console.error(`API Error (${response.status}):`, text);
    try {
      const errorJson = JSON.parse(text);
      throw new Error(errorJson.error || errorJson.message || `Server returned ${response.status}`);
    } catch (e) {
      // If it's not JSON, return the raw text if it's short, otherwise a generic error
      const snippet = text.length > 100 ? text.substring(0, 100) + "..." : text;
      throw new Error(`Server Error (${response.status}): ${snippet || "Unknown Error"}`);
    }
  }
  return response.json();
}

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
    return !!window.PublicKeyCredential;
  },

  /**
   * Register a new biometric credential (FaceID/Fingerprint)
   */
  async register(userId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Lo belum login bro! Token tidak ditemukan.");

      // 1. Get creation options from backend
      const response = await fetch(`${API_BASE_URL}/auth/webauthn/register/begin`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const options = await handleResponse(response);

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
      console.log("🛡️ WebAuthn Register Options:", options.publicKey);
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
      const finishResponse = await fetch(`${API_BASE_URL}/auth/webauthn/register/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await handleResponse(finishResponse);
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
      // If we have a session, use the 'verify' endpoints (Satpam VIP path)
      // Otherwise use the public 'login' endpoints (Fresh login)
      const pathPrefix = session ? 'verify' : 'login';
      const beginUrl = `${API_BASE_URL}/auth/webauthn/${pathPrefix}/begin`;
      
      const headers: any = { "Content-Type": "application/json" };
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const beginOptions: RequestInit = { 
        method: "POST", 
        headers,
        body: JSON.stringify({ nim: nim || undefined })
      };

      const response = await fetch(beginUrl, beginOptions);
      const options = await handleResponse(response);

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
      console.log("🛡️ WebAuthn Auth Options:", options.publicKey);
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
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const finishResponse = await fetch(`${API_BASE_URL}/auth/webauthn/${pathPrefix}/finish`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const result = await handleResponse(finishResponse);
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
      console.error("🔍 BIOMETRIC AUTH ERROR | Detail:", err);
      
      // NUCLEAR DEBUG ALERT (Biar lu bisa liat erornya di layar laptop!)
      alert("⚠️ DEBUG BIOMETRIK:\nEror: " + (err.name || "Error") + "\nPesan: " + (err.message || "Unknown error"));
      
      // Use backend error message if available, otherwise fallback to smart diagnostics
      let errorMessage = err.message || "Gagal login biometrik. Pastikan sensor tersedia atau pilih 'Scan QR'.";
      
      // Smart Error Diagnostics (Universal)
      if (err.name === 'NotAllowedError') {
        errorMessage = "Akses Dibatalkan / Hardware Gak Ketemu. Pastiin lu pake FaceID/Fingerprint. Kalau di Laptop gak ada sensor, pilih 'Use Phone / Scan QR' pas muncul popup Windows ya! 🛡️";
      } else if (err.name === 'SecurityError') {
        errorMessage = "Eror Keamanan (Domain Mismatch). Pastikan pake domain yang sama dengan saat daftar. (Gunakan Vercel untuk sinkronisasi antar perangkat). 🛡️";
      } else if (err.name === 'InvalidStateError') {
        errorMessage = "Data Biometrik tidak dikenali atau belum terdaftar di perangkat ini. 🛡️";
      }

      // Don't show toast for 2FA as the hook handles its own UI
      if (nim) toast.error(errorMessage, { duration: 6000 });
      return { success: false };
    }
  },

  /**
   * Check if the currently logged-on user has registered any biometric credentials
   */
  async getStatus(): Promise<{ is_registered: boolean }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { is_registered: false };

      const response = await fetch(`${API_BASE_URL}/auth/webauthn/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      return await handleResponse(response);
    } catch (err) {
      console.error("WebAuthn Status Check Error:", err);
      return { is_registered: false };
    }
  },
};
