import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card } from '@/Components/UI/Card';
import Button from '@/Components/UI/Button';
import PageHeader from '@/Components/UI/PageHeader';
import EmptyState from '@/Components/UI/EmptyState';
import { Book, Shield, Terminal, Wrench, FileText, Inbox } from 'lucide-react';

interface DashboardProps {
  stats: {
    challenges_solved: number;
    total_notes: number;
    total_payloads: number;
    total_tools: number;
  };
  recentDrafts: Array<{
    id: string;
    title: string;
    updated_at: string;
  }>;
  activityData?: Array<{ name: string; solved: number }>;
}

export default function Dashboard({
  stats = {
    challenges_solved: 0,
    total_notes: 0,
    total_payloads: 0,
    total_tools: 0,
  },
  recentDrafts = [],
}: DashboardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const quickActions = [
    { label: 'Catatan', href: route('notes.create'), icon: Book },
    { label: 'Challenge', href: route('challenges.create'), icon: Shield },
    { label: 'Payload', href: route('payloads.create'), icon: Terminal },
    { label: 'Tool', href: route('tools.create'), icon: Wrench },
  ];

  const statsItems = [
    { label: 'Catatan', value: stats.total_notes },
    { label: 'Challenge selesai', value: stats.challenges_solved },
    { label: 'Payload', value: stats.total_payloads },
    { label: 'Tools', value: stats.total_tools },
  ];

  return (
    <AuthenticatedLayout header="Dashboard">
      <Head title="Dashboard" />

      <PageHeader
        title="Dashboard"
        description="Ringkasan workspace dan akses cepat."
        actions={
          <>
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Button variant="secondary" size="sm">
                  <action.icon className="h-4 w-4" aria-hidden="true" /> {action.label}
                </Button>
              </Link>
            ))}
          </>
        }
      />

      {/* Statistik ringkas — satu baris, bukan sekumpulan kartu */}
      <div className="grid grid-cols-2 divide-x divide-edge overflow-hidden rounded-lg border border-edge bg-surface sm:grid-cols-4">
        {statsItems.map((item) => (
          <div key={item.label} className="px-4 py-3.5">
            <div className="text-lg font-semibold tabular-nums text-strong">{item.value}</div>
            <div className="mt-0.5 text-xs text-faint">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Catatan terbaru */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-strong">Catatan Terbaru</h2>
          <Link href={route('notes.index')} className="text-[13px] text-faint transition-colors hover:text-body">
            Lihat semua
          </Link>
        </div>

        <Card>
          {recentDrafts.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-4 w-4" />}
              title="Belum ada catatan"
              description="Catatan yang baru diedit akan muncul di sini."
            />
          ) : (
            <ul className="divide-y divide-edge">
              {recentDrafts.map((draft) => (
                <li key={draft.id}>
                  <Link
                    href={route('notes.show', draft.id)}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated/60"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-strong">{draft.title}</span>
                    <span className="shrink-0 text-xs text-faint">Diperbarui {formatDate(draft.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}