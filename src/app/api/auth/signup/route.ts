import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password, first_name, last_name, user_type = 'customer' } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          user_type,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'User registration failed' },
        { status: 500 }
      );
    }

    // Create user record in database
    const { error: dbError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      first_name,
      last_name,
      user_type,
    });

    if (dbError) {
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        user_type,
      },
    });
  } catch (err: unknown) {
    console.error('Auth signup error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}