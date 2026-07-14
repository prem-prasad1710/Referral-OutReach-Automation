import {
  Users,
  MailCheck,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type DashboardStats = {
  totalContacts: number;
  emailsSent: number;
  failedSends: number;
  successRate: number;
};

type StatsCardsProps = {
  stats: DashboardStats;
};

const items = [
  {
    key: "totalContacts" as const,
    label: "Total Contacts",
    description: "Imported recipients",
    icon: Users,
  },
  {
    key: "emailsSent" as const,
    label: "Sent",
    description: "Successful deliveries",
    icon: MailCheck,
  },
  {
    key: "failedSends" as const,
    label: "Failed",
    description: "Delivery failures",
    icon: AlertCircle,
  },
  {
    key: "successRate" as const,
    label: "Success Rate",
    description: "Sent vs failed",
    icon: TrendingUp,
    format: (v: number) => `${v}%`,
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ key, label, description, icon: Icon, format }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format ? format(stats[key]) : stats[key].toLocaleString()}
            </div>
            <CardDescription className="mt-1">{description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
