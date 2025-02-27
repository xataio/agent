export { auth as middleware } from '~/auth';

export const config = {
  // Don't run middleware on paths that don't require authentication
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
