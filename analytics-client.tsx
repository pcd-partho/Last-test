
"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

const topPerformingVideos = [
    { title: "The AI Revolution: How Machine Learning is Changing Everything", views: 7500, likes: 500, playlist: "AI Explained" },
    { title: "Neural Networks Explained in 10 Minutes", views: 6800, likes: 450, playlist: "AI Explained" },
    { title: "The Future of Coding with AI Assistants", views: 5200, likes: 320, playlist: "Future of Tech" },
    { title: "A Day in the Life of a Robotics Engineer", views: 3100, likes: 150, playlist: "Career Series" },
];

const audienceRetentionData = [
  { time: '0:00', retention: 100 },
  { time: '1:00', retention: 75 },
  { time: '2:00', retention: 60 },
  { time: '3:00', retention: 50 },
  { time: '4:00', retention: 45 },
  { time: '5:00', retention: 30 },
];

const demographicsData = [
  { name: '18-24', value: 45 },
  { name: '25-34', value: 30 },
  { name: '35-44', value: 15 },
  { name: '45-54', value: 5 },
  { name: '55+', value: 5 },
]

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--primary))" },
  likes: { label: "Likes", color: "hsl(var(--accent))" },
  retention: { label: "Retention", color: "hsl(var(--primary))" },
  value: { label: "Age Group", color: "hsl(var(--primary))" }
};

export default function AnalyticsClient() {
  return (
    <div className="flex flex-col gap-8">
        <h1 className="text-3xl font-bold font-headline">Analytics</h1>
        <div className="grid gap-8 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Audience Retention</CardTitle>
                    <CardDescription>Average view duration across all videos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={audienceRetentionData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8}/>
                            <YAxis unit="%" />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Line dataKey="retention" type="monotone" stroke="var(--color-retention)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Audience Demographics</CardTitle>
                    <CardDescription>Breakdown of your audience by age group.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={demographicsData} layout="vertical" accessibilityLayer>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} tickMargin={10} axisLine={false} />
                            <XAxis type="number" hide />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Top Performing Videos</CardTitle>
                <CardDescription>Your most popular videos based on views and likes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Playlist</TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Likes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topPerformingVideos.map((video) => (
                        <TableRow key={video.title}>
                            <TableCell className="font-medium">{video.title}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{video.playlist}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{video.views.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{video.likes.toLocaleString()}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
