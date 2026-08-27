'use client';

import {
  IconAlertTriangle,
  IconArrowUp,
  IconCloud,
  IconFileSpark,
  IconGauge,
  IconPhotoScan,
} from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';

const PROMPTS = [
  {
    icon: IconFileSpark,
    text: 'Draft marketing plan',
    prompt: 'Create a comprehensive marketing plan for my startup, including channel strategy, content calendar, and budget allocation.',
  },
  {
    icon: IconGauge,
    text: 'Analyze cash flow',
    prompt: 'Analyze my current cash flow situation, forecast the next 3 months, and identify potential risks or opportunities.',
  },
  {
    icon: IconAlertTriangle,
    text: 'Research competitors',
    prompt: 'Do a deep competitive analysis — pricing, positioning, strengths, weaknesses, and gaps I can exploit.',
  },
];

interface HelmAiInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  onToggleRecording?: () => void;
  onAttach?: () => void;
}

export default function HelmAiInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isRecording = false,
  onToggleRecording,
  onAttach,
}: HelmAiInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handlePromptClick = (prompt: string) => {
    if (inputRef.current) {
      inputRef.current.value = prompt;
      onChange(prompt);
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const renderMaxBadge = () => (
    <div className="flex h-[14px] items-center gap-1.5 rounded border border-border px-1 py-0">
      <span
        className="font-bold text-[9px] uppercase"
        style={{
          background:
            'linear-gradient(to right, rgb(129, 161, 193), rgb(125, 124, 155))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        MAX
      </span>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex min-h-[120px] cursor-text flex-col rounded-2xl border border-surface-200 bg-white shadow-lg">
        <div className="relative max-h-[258px] flex-1 overflow-y-auto">
          <Textarea
            className="min-h-[48.4px] w-full resize-none whitespace-pre-wrap break-words border-0 bg-transparent! p-3 text-[16px] text-surface-800 shadow-none outline-none transition-[padding] duration-200 ease-in-out placeholder:text-surface-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Helm anything..."
            ref={inputRef}
            value={value}
          />
        </div>

        <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1">
          <div className="flex aspect-1 items-center gap-1 rounded-full bg-surface-100 p-1.5 text-xs">
            <IconCloud className="h-4 w-4 text-surface-400" />
          </div>

          <div className="relative flex items-center">
            <Select defaultValue="helm-default">
              <SelectTrigger className="w-fit border-none bg-transparent! p-0 text-surface-400 text-sm shadow-none hover:text-surface-700 focus:ring-0">
                <SelectValue>
                  <div className="flex items-center gap-1">
                    <span>Helm</span>
                    {renderMaxBadge()}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helm-default">
                  <div className="flex items-center gap-1">
                    <span>Helm</span>
                    {renderMaxBadge()}
                  </div>
                </SelectItem>
                <SelectItem value="gpt-4o">
                  <span>GPT-4o</span>
                </SelectItem>
                <SelectItem value="claude-3.5">
                  <span>Claude 3.5 Sonnet</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button
              aria-label="Attach file"
              className="text-surface-400 transition-colors duration-100 ease-out hover:text-surface-700"
              onClick={onAttach}
              size="icon"
              title="Attach file"
              variant="ghost"
            >
              <IconPhotoScan className="h-5 w-5" />
            </Button>

            {onToggleRecording && (
              <Button
                aria-label={isRecording ? 'Stop recording' : 'Record voice'}
                className={cn(
                  'transition-colors duration-100 ease-out',
                  isRecording
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-surface-400 hover:text-surface-700',
                )}
                onClick={onToggleRecording}
                size="icon"
                title={isRecording ? 'Stop' : 'Voice'}
                variant="ghost"
              >
                {isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            )}

            <Button
              aria-label="Send message"
              className={cn(
                'cursor-pointer rounded-full bg-surface-800 transition-colors duration-100 ease-out',
                value && !disabled && 'bg-surface-800 hover:bg-surface-700!',
              )}
              disabled={!value || disabled}
              onClick={onSend}
              size="icon"
              variant="ghost"
            >
              <IconArrowUp className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {PROMPTS.map((button) => {
          const IconComponent = button.icon;
          return (
            <Button
              className="group flex h-auto items-center gap-2 rounded-full border bg-transparent px-3 py-2 text-surface-600 text-sm transition-colors duration-200 ease-out hover:bg-surface-50"
              key={button.text}
              onClick={() => handlePromptClick(button.prompt)}
              variant="ghost"
            >
              <IconComponent className="h-4 w-4 text-surface-400 transition-colors group-hover:text-surface-700" />
              <span>{button.text}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
