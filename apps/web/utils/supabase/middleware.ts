import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig } from './config';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  let url: string;
  let publishableKey: string;

  try {
    ({ url, publishableKey } = getSupabaseConfig());
  } catch {
    // Keep the existing local-first pages available until Supabase is
    // configured. Authenticated routes can enforce configuration explicitly.
    return supabaseResponse;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Public / excluded paths
    const isPublic =
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/auth') ||
      pathname === '/login';

    const isProtected =
      pathname.startsWith('/command-center') ||
      pathname.startsWith('/review') ||
      pathname.startsWith('/applications') ||
      pathname.startsWith('/interviews') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/analytics');

    if (!user) {
      // Unauthenticated access to protected routes
      if (isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Authenticated user
    // Check onboarding status
    if (user) {
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('id, onboarding_completed')
        .eq('owner_id', user.id)
        .maybeSingle();

      const hasCompletedOnboarding = Boolean(profile?.onboarding_completed);

      if (!hasCompletedOnboarding) {
        // Authenticated but needs onboarding
        if (
          pathname !== '/onboarding' &&
          !pathname.startsWith('/api/') &&
          !pathname.startsWith('/auth/') &&
          pathname !== '/login'
        ) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      } else {
        // Authenticated and already completed onboarding
        if (pathname === '/login' || pathname === '/onboarding') {
          const url = request.nextUrl.clone();
          url.pathname = '/command-center';
          return NextResponse.redirect(url);
        }
      }
    }
  } catch {
    // Network or parse error, let request proceed
  }

  return supabaseResponse;
}
