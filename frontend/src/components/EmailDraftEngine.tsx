import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/card';
import { Textarea } from '@/components/ui/card';
import { Input } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/card';
import { Loader2, Mail, Send, Copy, ListChecks } from 'lucide-react';

interface EmailDraft {
  subject: string;
  body: string;
  action_items: string[];
  suggested_recipients: string[];
  summary: string;
  task_id: string;
}

const EmailDraftEngine: React.FC = () => {
  const [meetingNotes, setMeetingNotes] = useState('');
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);

  const generateDraft = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_notes: meetingNotes,
          user_intent: intent,
          tone: tone,
          user_id: 'user_123' // Demo ID
        })
      });
      const data = await response.json();
      setDraft(data);
    } catch (error) {
      console.error('Failed to generate draft:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            AI Email Drafting Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Meeting Notes / Context</label>
            <Textarea 
              placeholder="Paste meeting transcript or notes here..."
              className="h-32"
              value={meetingNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMeetingNotes(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">User Intent</label>
              <Input 
                placeholder="e.g. Follow up on the project alpha launch"
                value={intent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Supportive">Supportive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={generateDraft}
            disabled={loading || !meetingNotes || !intent}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Generate Draft
          </Button>
        </CardContent>
      </Card>

      {draft && (
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>AI Generated Draft</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(draft.body)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Body
              </Button>
            </div>
            <div className="mt-2 text-sm text-gray-500 italic">
              Summary: {draft.summary}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400">Subject</label>
              <div className="p-3 bg-gray-50 rounded border font-medium">
                {draft.subject}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400">Email Body</label>
              <div className="p-4 bg-gray-50 rounded border whitespace-pre-wrap leading-relaxed">
                {draft.body}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                  <ListChecks className="w-3 h-3" />
                  Action Items
                </label>
                <ul className="space-y-1">
                  {draft.action_items.map((item, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-blue-500">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400">Suggested Recipients</label>
                <div className="flex flex-wrap gap-2">
                  {draft.suggested_recipients.map((recipient, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {recipient}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailDraftEngine;
