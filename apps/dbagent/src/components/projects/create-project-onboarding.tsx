'use client';

import { Button, Card, CardContent, CardFooter, CardHeader, Input, Label } from '@internal/components';
import type React from 'react';
import { useState } from 'react';
import RobotAvatar from '../ui/robot-avatar';
import { createProject } from './actions';

export default function CreateProjectOnboarding() {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsLoading(true);
    const id = await createProject({ name: projectName });

    // Here you would typically create the project via an API
    console.log('Created project:', projectName, id);

    setIsLoading(false);
  };

  return (
    <div className="from-background via-primary/5 to-secondary/5 flex h-full w-full items-center justify-center bg-gradient-to-br">
      <div className="pointer-events-none absolute left-0 top-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="bg-primary/20 absolute h-1 w-1 animate-pulse rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2000}ms`
            }}
          />
        ))}
      </div>

      <Card className="border-primary/20 shadow-primary/5 bg-background/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-0 text-center">
          <div className="bg-primary relative mx-auto h-48 w-48 overflow-hidden rounded-full p-1 shadow-lg">
            <div className="bg-background flex h-full w-full items-center justify-center overflow-hidden rounded-full backdrop-blur-sm">
              <RobotAvatar className={`text-primary animate-float transition-all duration-300`} />
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="projectName" className="text-sm font-medium">
                  How shall we name your first project?
                </Label>
                <Input
                  id="projectName"
                  placeholder="My Awesome Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading || !projectName.trim()}>
              <span className="relative z-10">{isLoading ? 'Creating...' : 'Create project'}</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
