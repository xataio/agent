'use client';

import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  toast
} from '@internal/components';
import { Database, MoreVertical, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Project } from '~/lib/db/projects';
import { createProject, deleteProject, renameProject } from './actions';

interface ProjectListProps {
  projects: Project[];
}

function CreateProjectButton() {
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsLoading(true);

    const result = await createProject({ name: projectName });
    if (result.success) {
      router.push(`/projects/${result.id}/start`);
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="projectName" className="text-sm font-medium">
                Project Name
              </Label>
              <Input
                id="projectName"
                placeholder="My Project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="border-primary/20 focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading || !projectName.trim()}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectsList({ projects }: ProjectListProps) {
  return (
    <div className="h-full w-full p-8">
      {projects.length === 0 ? (
        <CreateProjectOnboarding />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Database Projects</h1>
              <p className="text-muted-foreground mt-1">Manage your postgres database projects</p>
            </div>
            <CreateProjectButton />
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
  const router = useRouter();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleRename = async () => {
    if (newProjectName.trim() !== '') {
      const result = await renameProject({ id: project.id, name: newProjectName });
      if (result.success) {
        toast.success('Project renamed successfully');
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setShowRenameModal(false);
    }
  };

  const handleDelete = async () => {
    const result = await deleteProject({ id: project.id });
    if (result.success) {
      toast.success('Project deleted successfully');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <Card
        className="cursor-pointer transition-all hover:shadow-md"
        onClick={() => {
          router.push(`/projects/${project.id}/start`);
        }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            <CardTitle className="text-xl">{project.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="cursor-pointer" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRenameModal(true);
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <Dialog open={showRenameModal} onOpenChange={(open) => setShowRenameModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Enter new project name"
          />
          <DialogFooter>
            <Button onClick={handleRename}>Rename</Button>
            <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => setShowDeleteModal(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <DialogDescription>Are you sure you want to delete this project?</DialogDescription>
          <DialogFooter>
            <Button onClick={handleDelete}>Delete</Button>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateProjectOnboarding() {
  const router = useRouter();

  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsLoading(true);

    const result = await createProject({ name: projectName });
    if (result.success) {
      router.push(`/projects/${result.id}/start`);
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
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
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="projectName" className="text-sm font-medium">
                  Create a new project
                </Label>
                <Input
                  id="projectName"
                  placeholder="My Project"
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
