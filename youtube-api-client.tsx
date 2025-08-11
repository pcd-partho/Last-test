
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

export default function GuideClient() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Setup Guide</h1>
        <p className="text-muted-foreground mt-2">
          Follow these steps to get your YouTube API Key and Channel ID.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Part 1: Get Your YouTube API Key</CardTitle>
          <CardDescription>
            This key allows the application to interact with the YouTube API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong>Go to the Google Cloud Console:</strong> Navigate to{" "}
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                console.cloud.google.com
              </a>{" "}
              and log in with your Google account.
            </li>
            <li>
              <strong>Create a new project:</strong> Click the project dropdown in the top bar, then click 'New Project'. Give it a descriptive name like "AutoTubeAI" and click 'Create'.
            </li>
            <li>
              <strong>Enable the YouTube Data API:</strong> In the search bar at the top, search for "YouTube Data API v3" and select it. Click the 'Enable' button. You may have to wait a few minutes for it to be enabled.
            </li>
            <li>
              <strong>Create Credentials:</strong> Once enabled, click the 'Create Credentials' button on the top right.
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 bg-muted p-3 rounded-md">
                <li>On the "Which API are you using?" dropdown, select <strong>YouTube Data API v3</strong>.</li>
                <li>For "What data will you be accessing?", select <strong>Public data</strong>.</li>
                <li>Click 'Next'. Your API key will be displayed.</li>
              </ul>
            </li>
            <li>
              <strong>Copy your API Key:</strong> Click the copy icon next to the key. This is the value you will paste into the "YouTube API Key" field in this application's settings.
            </li>
          </ol>
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Important Security Note</AlertTitle>
            <AlertDescription>
              It's highly recommended to restrict your API key to prevent unauthorized use. From the Credentials page, click on your new API key, and under "Application restrictions", select "IP addresses" and add the IP address of your server. For web clients, you can use "HTTP referrers".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 2: Get Your YouTube Channel ID</CardTitle>
          <CardDescription>
            This ID specifies which channel (especially a brand channel) the videos will be uploaded to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong>Go to YouTube's Advanced Settings:</strong> Navigate to{" "}
              <a href="https://www.youtube.com/account_advanced" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                youtube.com/account_advanced
              </a>.
            </li>
            <li>
              <strong>Sign in:</strong> Make sure you are signed into the Google Account that owns or manages the YouTube channel you want to use.
            </li>
            <li>
              <strong>Switch accounts if necessary:</strong> If you manage multiple channels, use the profile icon in the top right to switch to the correct brand account.
            </li>
            <li>
              <strong>Copy your Channel ID:</strong> On the advanced settings page, you will see your "User ID" and your "Channel ID". Copy the **Channel ID**. It will start with "UC".
            </li>
            <li>
              <strong>Paste your Channel ID:</strong> This is the value you will paste into the "YouTube Channel ID" field in this application's settings.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
