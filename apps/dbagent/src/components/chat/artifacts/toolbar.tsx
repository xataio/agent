'use client';

import { UseChatHelpers } from '@ai-sdk/react';
import { cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xata.io/components';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpIcon, StopCircleIcon } from 'lucide-react';
import { type Dispatch, memo, ReactNode, RefObject, type SetStateAction, useEffect, useRef, useState } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import { artifactDefinitions, ArtifactKind } from './artifact';
import { ArtifactToolbarItem } from './create-artifact';

type ToolProps = {
  description: string;
  icon: ReactNode;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  isToolbarVisible?: boolean;
  setIsToolbarVisible?: Dispatch<SetStateAction<boolean>>;
  isAnimating: boolean;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  onClick: ({ appendMessage }: { appendMessage: UseChatHelpers['append'] }) => void;
};

const Tool = ({
  description,
  icon,
  selectedTool,
  setSelectedTool,
  isToolbarVisible,
  setIsToolbarVisible,
  isAnimating,
  append,
  onClick
}: ToolProps) => {
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (selectedTool !== description) {
      setIsHovered(false);
    }
  }, [selectedTool, description]);

  const handleSelect = () => {
    if (!isToolbarVisible && setIsToolbarVisible) {
      setIsToolbarVisible(true);
      return;
    }

    if (!selectedTool) {
      setIsHovered(true);
      setSelectedTool(description);
      return;
    }

    if (selectedTool !== description) {
      setSelectedTool(description);
    } else {
      setSelectedTool(null);
      onClick({ appendMessage: append });
    }
  };

  return (
    <Tooltip open={isHovered && !isAnimating}>
      <TooltipTrigger asChild>
        <motion.div
          className={cn('rounded-full p-3', {
            'bg-primary !text-primary-foreground': selectedTool === description
          })}
          onHoverStart={() => {
            setIsHovered(true);
          }}
          onHoverEnd={() => {
            if (selectedTool !== description) setIsHovered(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSelect();
            }
          }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.1 } }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          exit={{
            scale: 0.9,
            opacity: 0,
            transition: { duration: 0.1 }
          }}
          onClick={() => {
            handleSelect();
          }}
        >
          {selectedTool === description ? <ArrowUpIcon /> : icon}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={16} className="bg-foreground text-background rounded-2xl p-3 px-4">
        {description}
      </TooltipContent>
    </Tooltip>
  );
};

export const Tools = ({
  isToolbarVisible,
  selectedTool,
  setSelectedTool,
  append,
  isAnimating,
  setIsToolbarVisible,
  tools
}: {
  isToolbarVisible: boolean;
  selectedTool: string | null;
  setSelectedTool: Dispatch<SetStateAction<string | null>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isAnimating: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  tools: Array<ArtifactToolbarItem>;
}) => {
  const [primaryTool, ...secondaryTools] = tools;

  return (
    <motion.div
      className="flex flex-col gap-1.5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <AnimatePresence>
        {isToolbarVisible &&
          secondaryTools.map((secondaryTool) => (
            <Tool
              key={secondaryTool.description}
              description={secondaryTool.description}
              icon={secondaryTool.icon}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              append={append}
              isAnimating={isAnimating}
              onClick={secondaryTool.onClick}
            />
          ))}
      </AnimatePresence>

      {primaryTool && (
        <Tool
          description={primaryTool.description}
          icon={primaryTool.icon}
          selectedTool={selectedTool}
          setSelectedTool={setSelectedTool}
          isToolbarVisible={isToolbarVisible}
          setIsToolbarVisible={setIsToolbarVisible}
          append={append}
          isAnimating={isAnimating}
          onClick={primaryTool.onClick}
        />
      )}
    </motion.div>
  );
};

const PureToolbar = ({
  isToolbarVisible,
  setIsToolbarVisible,
  append,
  status,
  stop,
  setMessages,
  artifactKind
}: {
  isToolbarVisible: boolean;
  setIsToolbarVisible: Dispatch<SetStateAction<boolean>>;
  status: UseChatHelpers['status'];
  append: UseChatHelpers['append'];
  stop: UseChatHelpers['stop'];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  artifactKind: ArtifactKind;
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useOnClickOutside(toolbarRef as RefObject<HTMLElement>, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedTool(null);
      setIsToolbarVisible(false);
    }, 2000);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'streaming') {
      setIsToolbarVisible(false);
    }
  }, [status, setIsToolbarVisible]);

  const artifactDefinition = artifactDefinitions.find((definition) => definition.kind === artifactKind);

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const toolsByArtifactKind = artifactDefinition.toolbar;

  if (toolsByArtifactKind.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="bg-background absolute bottom-6 right-6 flex cursor-pointer flex-col justify-end rounded-full border p-1.5 shadow-lg"
        initial={{ opacity: 0, y: -20, scale: 1 }}
        animate={
          isToolbarVisible
            ? {
                opacity: 1,
                y: 0,
                height: toolsByArtifactKind.length * 50,
                transition: { delay: 0 },
                scale: 1
              }
            : { opacity: 1, y: 0, height: 54, transition: { delay: 0 } }
        }
        exit={{ opacity: 0, y: -20, transition: { duration: 0.1 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onHoverStart={() => {
          if (status === 'streaming') return;

          cancelCloseTimer();
          setIsToolbarVisible(true);
        }}
        onHoverEnd={() => {
          if (status === 'streaming') return;

          startCloseTimer();
        }}
        onAnimationStart={() => {
          setIsAnimating(true);
        }}
        onAnimationComplete={() => {
          setIsAnimating(false);
        }}
        ref={toolbarRef}
      >
        {status === 'streaming' ? (
          <motion.div
            key="stop-icon"
            initial={{ scale: 1 }}
            animate={{ scale: 1.4 }}
            exit={{ scale: 1 }}
            className="p-3"
            onClick={() => {
              stop();
              setMessages((messages) => messages);
            }}
          >
            <StopCircleIcon />
          </motion.div>
        ) : (
          <Tools
            key="tools"
            append={append}
            isAnimating={isAnimating}
            isToolbarVisible={isToolbarVisible}
            selectedTool={selectedTool}
            setIsToolbarVisible={setIsToolbarVisible}
            setSelectedTool={setSelectedTool}
            tools={toolsByArtifactKind}
          />
        )}
      </motion.div>
    </TooltipProvider>
  );
};

export const Toolbar = memo(PureToolbar, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.isToolbarVisible !== nextProps.isToolbarVisible) return false;
  if (prevProps.artifactKind !== nextProps.artifactKind) return false;

  return true;
});
