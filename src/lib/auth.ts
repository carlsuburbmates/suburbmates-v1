import { AuthSession, User, Vendor } from "./types";

// Re-export the supabase client from supabase.ts
import { supabase } from "./supabase";

// Auth state management
class AuthManager {
  private currentSession: AuthSession | null = null;

  async signUp(
    email: string,
    password: string,
    userData: {
      first_name?: string;
      last_name?: string;
      user_type?: "customer" | "vendor";
    }
  ): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type || "customer",
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("User registration failed");
    }

    // Create user record in users table
    await this.createUserRecord(data.user, userData);

    const session = await this.createAuthSession(data.user);
    this.currentSession = session;

    return session;
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const session = await this.createAuthSession(data.user);
    this.currentSession = session;

    return session;
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentSession = null;
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    if (this.currentSession) {
      return this.currentSession;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const session = await this.createAuthSession(user);
    this.currentSession = session;
    return session;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.refreshSession();

    if (error || !session?.user) {
      this.currentSession = null;
      return null;
    }

    const authSession = await this.createAuthSession(session.user);
    this.currentSession = authSession;
    return authSession;
  }

  private async createUserRecord(
    user: { id: string; email?: string },
    userData: { first_name?: string; last_name?: string; user_type?: string }
  ): Promise<void> {
    const { error } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      user_type: userData.user_type || "customer",
    });

    if (error) {
      throw new Error(`Failed to create user record: ${error.message}`);
    }
  }

  private async createAuthSession(user: {
    id: string;
    email?: string;
  }): Promise<AuthSession> {
    // Get user data from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError) {
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    const session: AuthSession = {
      user: userData,
      token:
        (await supabase.auth.getSession()).data.session?.access_token || "",
    };

    // Get vendor data if user is a vendor
    if (userData.user_type === "vendor") {
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!vendorError && vendorData) {
        session.vendor = vendorData;
      }
    }

    return session;
  }

  // Vendor-specific methods
  async createVendorProfile(vendorData: {
    business_name: string;
    bio?: string;
    primary_lga_id?: number;
    profile_url?: string;
  }): Promise<Vendor> {
    const session = await this.getCurrentSession();
    if (!session || session.user.user_type !== "vendor") {
      throw new Error("Must be authenticated as vendor");
    }

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        user_id: session.user.id,
        tier: "none",
        business_name: vendorData.business_name,
        bio: vendorData.bio,
        primary_lga_id: vendorData.primary_lga_id,
        profile_url: vendorData.profile_url,
        abn_verified: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create vendor profile: ${error.message}`);
    }

    // Update user type to vendor
    await supabase
      .from("users")
      .update({
        user_type: "vendor",
      })
      .eq("id", session.user.id);

    // Refresh session
    this.currentSession = await this.refreshSession();

    return data;
  }

  async updateVendorProfile(vendorData: Partial<Vendor>): Promise<Vendor> {
    const session = await this.getCurrentSession();
    if (!session?.vendor) {
      throw new Error("Must have vendor profile");
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(vendorData)
      .eq("id", session.vendor.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update vendor profile: ${error.message}`);
    }

    // Refresh session
    this.currentSession = await this.refreshSession();

    return data;
  }

  // Utility methods
  isVendor(): boolean {
    return this.currentSession?.user.user_type === "vendor";
  }

  isAdmin(): boolean {
    return this.currentSession?.user.user_type === "admin";
  }

  getCurrentUser(): User | null {
    return this.currentSession?.user || null;
  }

  getCurrentVendor(): Vendor | null {
    return this.currentSession?.vendor || null;
  }

  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }
}

export const authManager = new AuthManager();

// Supabase auth state listener
supabase.auth.onAuthStateChange(async (event) => {
  if (event === "SIGNED_IN") {
    // User signed in
    await authManager.refreshSession();
  } else if (event === "SIGNED_OUT") {
    // User signed out
    authManager["currentSession"] = null;
  }
});
