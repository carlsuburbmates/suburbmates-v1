import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get session from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const { business_name, bio, primary_lga_id, profile_url } = await req.json();

    // Validate required fields
    if (!business_name) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Check if vendor profile already exists
    const { data: existingVendor, error: checkError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!checkError && existingVendor) {
      return NextResponse.json(
        { error: 'Vendor profile already exists' },
        { status: 400 }
      );
    }

    // Create vendor profile
    const { data: vendor, error: vendorError } = await supabase.from('vendors').insert({
      user_id: user.id,
      tier: 'none',
      business_name,
      bio,
      primary_lga_id,
      profile_url,
      abn_verified: false,
      product_count: 0,
      storage_used_mb: 0,
    }).select().single();

    if (vendorError) {
      return NextResponse.json(
        { error: `Failed to create vendor profile: ${vendorError.message}` },
        { status: 500 }
      );
    }

    // Update user type to vendor
    const { error: userError } = await supabase.from('users').update({
      user_type: 'vendor'
    }).eq('id', user.id);

    if (userError) {
      // Rollback vendor creation if user update fails
      await supabase.from('vendors').delete().eq('id', vendor.id);
      return NextResponse.json(
        { error: `Failed to update user type: ${userError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Vendor profile created successfully',
      vendor,
    });
  } catch (err: unknown) {
    console.error('Create vendor error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}