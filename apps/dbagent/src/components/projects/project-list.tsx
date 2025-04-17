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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast
} from '@xata.io/components';
import { Database, MoreVertical, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { CloudProvider, Project } from '~/lib/db/schema';
import { actionCreateProject, actionDeleteProject, actionUpdateProject } from './actions';

interface ProjectListProps {
  projects: Project[];
}

const CloudProviders: Array<{ name: string; value: CloudProvider }> = [
  { name: 'AWS', value: 'aws' },
  { name: 'GCP', value: 'gcp' },
  { name: 'Other', value: 'other' }
];

function CreateProjectButton() {
  const [projectName, setProjectName] = useState('');
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>(CloudProviders[0]?.value ?? 'aws');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsLoading(true);

    try {
      const projectId = await actionCreateProject(projectName, cloudProvider);
      router.push(`/projects/${projectId}/start`);
    } catch (error: any) {
      toast.error(error.message);
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
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="cloudProvider" className="text-sm font-medium">
                Cloud Provider
              </Label>
              <Select value={cloudProvider} onValueChange={(value) => setCloudProvider(value as CloudProvider)}>
                <SelectTrigger className="border-primary/20 focus-visible:ring-primary/30">
                  <SelectValue placeholder="Select a cloud provider" />
                </SelectTrigger>
                <SelectContent>
                  {CloudProviders.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    <div className="mx-auto h-full w-full max-w-6xl px-8 pt-24">
      {projects.length === 0 ? (
        <CreateProjectOnboarding />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
              <p className="text-muted-foreground mt-1">
                A project can monitor several databases with shared cloud and notification settings.
              </p>
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
      try {
        await actionUpdateProject(project.id, { name: newProjectName });
        toast.success('Project renamed successfully');
        router.refresh();
      } catch (error: any) {
        toast.error(error.message);
      }
      setShowRenameModal(false);
    }
  };

  const handleDelete = async () => {
    try {
      await actionDeleteProject(project.id);
      toast.success('Project deleted successfully');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setShowDeleteModal(false);
    }
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
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
              <Database className="h-5 w-5" />
            </div>

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

  const [projectName, setProjectName] = useState('My Project');
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>(CloudProviders[0]?.value || 'aws');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsLoading(true);

    try {
      const projectId = await actionCreateProject(projectName, cloudProvider);
      router.push(`/projects/${projectId}/start`);
    } catch (error: any) {
      toast.error(error.message);
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
              top: `${(i * 5) % 100}%`,
              left: `${(i * 5) % 100}%`,
              animationDelay: `${(i * 100) % 2000}ms`
            }}
          />
        ))}
      </div>

      <Card className="border-primary/20 shadow-primary/5 bg-background/80 max-w-120 shadow-lg backdrop-blur-sm">
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="projectName" className="text-sm font-medium">
                  Create a new project
                </Label>
                <p className="text-muted-foreground mt-1 text-xs">
                  Each project can monitor several databases with shared cloud and notification settings.
                </p>
                <Input
                  id="projectName"
                  placeholder="My Project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  className="border-primary/20 focus-visible:ring-primary/30"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="cloudProvider" className="text-sm font-medium">
                  Cloud Provider
                </Label>
                <p className="text-muted-foreground mt-1 text-xs">
                  We’ll tailor your onboarding to your cloud provider. If you choose “Other,” you can monitor any
                  Postgres, but the Agent won&apos;t get metrics or logs unless you set up custom tools.
                </p>
                <Select value={cloudProvider} onValueChange={(value) => setCloudProvider(value as CloudProvider)}>
                  <SelectTrigger className="border-primary/20 focus-visible:ring-primary/30">
                    <SelectValue placeholder="Select a cloud provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {CloudProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
