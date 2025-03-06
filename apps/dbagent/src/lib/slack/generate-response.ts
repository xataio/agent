import { CoreMessage, generateText } from 'ai';
import { chatSystemPrompt, getModelInstance, getTools } from '../ai/aidba';
import { getConnection } from '../db/connections';
import { getProjectById } from '../db/projects';
import { getMemoryValue, getUserProjects, setMemoryValue } from '../db/slack';
import { getTargetDbConnection } from '../targetdb/db';

// Function to handle project-related commands
async function handleProjectCommand(text: string, userId: string, conversationId: string): Promise<string> {
  const useProjectMatch = text.match(/^use project (.+)$/i);
  if (useProjectMatch) {
    const projectName = useProjectMatch[1];
    const userProjects = await getUserProjects(userId);
    for (const userProject of userProjects) {
      const { project } = await getProjectById(userProject.projectId);
      if (project && project.name.toLowerCase() === projectName?.toLowerCase()) {
        await setMemoryValue(userId, conversationId, 'currentProjectId', project.id);
        return `Now working with project "${project.name}". You can start asking questions about your database.`;
      }
    }
    return `Project "${projectName}" not found or you don't have access to it. Try 'list projects' to see available projects.`;
  }

  if (text.toLowerCase() === 'list projects') {
    const userProjects = await getUserProjects(userId);
    if (userProjects.length === 0) {
      return "You don't have access to any projects yet. Please ask your administrator to grant you access.";
    }
    const projects = await Promise.all(userProjects.map((up) => getProjectById(up.projectId)));
    const projectList = projects
      .filter((p) => p !== null)
      .map((p) => `- ${p.project?.name}`)
      .join('\n');
    return `Your projects:\n${projectList}\n\nUse 'use project <name>' to select a project.`;
  }

  return '';
}

export const generateResponse = async (messages: CoreMessage[], conversationId: string) => {
  // Get the conversation context
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return "I couldn't understand your message.";
  }

  // Extract user context from the conversation ID
  const userContext = await getMemoryValue<any>('system', conversationId, 'userContext');
  if (!userContext) {
    return 'Error: User context not found.';
  }

  // Handle project-related commands
  const projectCommandResponse = await handleProjectCommand(
    lastMessage.content as string,
    userContext.userId,
    conversationId
  );
  if (projectCommandResponse) {
    return projectCommandResponse;
  }

  // If no project is selected, prompt the user to select one
  const projectId = await getMemoryValue<string>(userContext.userId, conversationId, 'currentProjectId');
  if (!projectId) {
    return "Please select a project first by using 'use project <name>' or 'list projects' to see available projects.";
  }

  // Get the database connection for the current project
  const connection = await getConnection(projectId);
  if (!connection) {
    return 'No database connection found for this project. Please set up a connection first.';
  }

  // Get the database client
  const targetClient = await getTargetDbConnection(connection.connectionString);

  // Generate the response using the AI model
  const { text } = await generateText({
    model: getModelInstance('openai-gpt-4o'),
    messages,
    system: chatSystemPrompt,
    tools: await getTools(connection, targetClient),
    maxSteps: 20
  });

  // Convert markdown to Slack mrkdwn format
  return text.replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>').replace(/\*\*/g, '*');
};
