import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/UI/Card';
import { Shield, Book, Terminal, Code, Activity, Clock } from 'lucide-react';
import EmptyState from '@/Components/UI/EmptyState';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'; // Import wajib ditambah

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
  activityData: Array<{
    name: string;
    solved: number;
  }>;
}

export default function Dashboard({
  stats = {
    challenges_solved: 0,
    total_notes: 0,
    total_payloads: 0,
    total_tools: 0,
  },
  recentDrafts = [],
  activityData = [], // Parameter wajib ditambah
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

  return (
    <AuthenticatedLayout header="Overview">
      <Head title="Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Challenge Solved
            </CardTitle>
            <Shield className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.challenges_solved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Total Notes
            </CardTitle>
            <Book className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.total_notes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Payload Vault
            </CardTitle>
            <Terminal className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.total_payloads}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Custom Tools
            </CardTitle>
            <Code className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.total_tools}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center text-zinc-100">
              <Activity className="w-4 h-4 mr-2 text-blue-500" />
              Aktivitas Solving (7 Hari Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-250px">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#52525b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '8px',
                    color: '#f4f4f5',
                  }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area
                  type="monotone"
                  dataKey="solved"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSolved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-100">Catatan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDrafts.length === 0 ? (
              <EmptyState
                  icon={<Clock className="w-8 h-8" />}
                  title="Belum ada catatan"
                  description="Catatan yang baru diedit akan muncul di sini."
              />
            ) : (
              <div className="space-y-4">
                  {recentDrafts.map(draft => (
                      <Link key={draft.id} href={route('notes.show', draft.id)} className="block p-4 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                          <h4 className="text-zinc-100 font-medium truncate">{draft.title}</h4>
                          <p className="text-xs text-zinc-500 mt-1">Diperbarui {formatDate(draft.updated_at)}</p>
                      </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
