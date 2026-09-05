import { notFound } from 'next/navigation';
import {
  EventsView,
  EventDetail,
  AboutView,
  ContactView,
} from '@/components/club/public-pages';
import {
  AuthView,
  MemberView,
  TicketView,
} from '@/components/club/member-pages';
import { AdminView, ScannerView } from '@/components/club/admin-pages';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const route = slug.join('/');
  if (slug[0] === 'events' && slug.length === 2)
    return <EventDetail id={slug[1]} />;
  if (slug[0] === 'ticket' && slug.length === 2)
    return <TicketView id={slug[1]} />;
  switch (route) {
    case 'events':
      return <EventsView />;
    case 'about':
      return <AboutView />;
    case 'contact':
      return <ContactView />;
    case 'login':
      return <AuthView />;
    case 'register':
      return <AuthView register />;
    case 'member':
      return <MemberView />;
    case 'admin':
      return <AdminView />;
    case 'admin/scan':
      return <ScannerView />;
    default:
      notFound();
  }
}
