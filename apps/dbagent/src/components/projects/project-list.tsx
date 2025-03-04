'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton
} from '@internal/components';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Project } from '~/lib/db/projects';
import CreateProjectOnboarding from './create-project-onboarding';

interface ProjectListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectListProps) {
  const router = useRouter();

  const createProject = (provider: string) => {
    router.push(`/projects/create/${provider}`);
  };

  return (
    <div className="h-full w-full">
      {projects.length === 0 ? (
        <CreateProjectOnboarding />
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Database Projects</h1>
              <p className="text-muted-foreground mt-1">Manage your postgres database projects</p>
            </div>
            <Button onClick={() => {}}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>

          <ProjectListView projects={projects} />
        </div>
      )}
    </div>
  );
}

function ProjectListView({ projects }: ProjectListProps) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="mb-2 h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </Suspense>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={() => {
        // In a real app, you would navigate to the project details page
        console.log(`Navigating to project: ${project.id}`);
        // Example: router.push(`/projects/${project.id}`)
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{project.name}</CardTitle>
        </div>
        <CardDescription>ID: {project.id}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* {project.type === 'postgres' ? (
          <div className="text-muted-foreground flex items-center text-sm">
            <Database className="mr-2 h-4 w-4" />
            <span>PostgreSQL Database</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Server className="mr-2 h-4 w-4" />
              <span>{project.info.clusterIdentifier}</span>
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Region: {project.info.region}</span>
              <span>Status: {project.info.details.status}</span>
            </div>
            <div className="text-muted-foreground text-xs">
              Engine: {project.info.details.engine} v{project.info.details.engineVersion}
            </div>
          </div>
        )} */}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => {
            // Prevent the card click event from firing when clicking the button
            e.stopPropagation();
            // In a real app, you might want to perform a different action here
            console.log(`View details for project: ${project.id}`);
          }}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
