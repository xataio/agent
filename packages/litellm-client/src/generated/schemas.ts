/**
 * Generated by @openapi-codegen
 *
 * @version 1.65.1
 */
export type AddTeamCallback = {
  callback_name: string;
  /**
   * @default success_and_failure
   */
  callback_type?: ('success' | 'failure' | 'success_and_failure') | null;
  callback_vars: {
    [key: string]: string;
  };
};

export type BlockKeyRequest = {
  key: string;
};

export type BlockTeamRequest = {
  team_id: string;
};

export type BlockUsers = {
  user_ids: string[];
};

export type BodyAudioTranscriptionsAudioTranscriptionsPost = {
  /**
   * @format binary
   */
  file: Blob;
};

export type BodyAudioTranscriptionsV1AudioTranscriptionsPost = {
  /**
   * @format binary
   */
  file: Blob;
};

export type BodyCreateFileProviderV1FilesPost = {
  purpose: string;
  /**
   * @default openai
   */
  custom_llm_provider?: string;
  /**
   * @format binary
   */
  file: Blob;
};

export type BodyCreateFileFilesPost = {
  purpose: string;
  /**
   * @default openai
   */
  custom_llm_provider?: string;
  /**
   * @format binary
   */
  file: Blob;
};

export type BodyCreateFileV1FilesPost = {
  purpose: string;
  /**
   * @default openai
   */
  custom_llm_provider?: string;
  /**
   * @format binary
   */
  file: Blob;
};

export type BodyTestModelConnectionHealthTestConnectionPost = {
  /**
   * The mode to test the model with
   *
   * @default chat
   */
  mode?:
    | (
        | 'chat'
        | 'completion'
        | 'embedding'
        | 'audio_speech'
        | 'audio_transcription'
        | 'image_generation'
        | 'batch'
        | 'rerank'
        | 'realtime'
      )
    | null;
  /**
   * Parameters for litellm.completion, litellm.embedding for the health check
   */
  litellm_params?: Record<string, any>;
};

/**
 * Breakdown of spend by different dimensions
 */
export type BreakdownMetrics = {
  models?: {
    [key: string]: SpendMetrics;
  };
  providers?: {
    [key: string]: SpendMetrics;
  };
  api_keys?: {
    [key: string]: SpendMetrics;
  };
};

export type BudgetConfig = {
  max_budget?: number | null;
  budget_duration?: string | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
};

export type BudgetDeleteRequest = {
  id: string;
};

export type BudgetNewRequest = {
  /**
   * The unique budget id.
   */
  budget_id?: string | null;
  /**
   * Requests will fail if this budget (in USD) is exceeded.
   */
  max_budget?: number | null;
  /**
   * Requests will NOT fail if this is exceeded. Will fire alerting though.
   */
  soft_budget?: number | null;
  /**
   * Max concurrent requests allowed for this budget id.
   */
  max_parallel_requests?: number | null;
  /**
   * Max tokens per minute, allowed for this budget id.
   */
  tpm_limit?: number | null;
  /**
   * Max requests per minute, allowed for this budget id.
   */
  rpm_limit?: number | null;
  /**
   * Max duration budget should be set for (e.g. '1hr', '1d', '28d')
   */
  budget_duration?: string | null;
  /**
   * Max budget for each model (e.g. {'gpt-4o': {'max_budget': '0.0000001', 'budget_duration': '1d', 'tpm_limit': 1000, 'rpm_limit': 1000}})
   */
  model_max_budget?: {
    [key: string]: BudgetConfig;
  } | null;
};

export type BudgetRequest = {
  budgets: string[];
};

export type CachePingResponse = {
  status: string;
  cache_type: string;
  ping_response?: boolean | null;
  set_cache_response?: string | null;
  litellm_cache_params?: string | null;
  health_check_cache_params?: Record<string, any> | null;
};

export type CallTypes =
  | 'embedding'
  | 'aembedding'
  | 'completion'
  | 'acompletion'
  | 'atext_completion'
  | 'text_completion'
  | 'image_generation'
  | 'aimage_generation'
  | 'moderation'
  | 'amoderation'
  | 'atranscription'
  | 'transcription'
  | 'aspeech'
  | 'speech'
  | 'rerank'
  | 'arerank'
  | '_arealtime'
  | 'create_batch'
  | 'acreate_batch'
  | 'aretrieve_batch'
  | 'retrieve_batch'
  | 'pass_through_endpoint'
  | 'anthropic_messages'
  | 'get_assistants'
  | 'aget_assistants'
  | 'create_assistants'
  | 'acreate_assistants'
  | 'delete_assistant'
  | 'adelete_assistant'
  | 'acreate_thread'
  | 'create_thread'
  | 'aget_thread'
  | 'get_thread'
  | 'a_add_message'
  | 'add_message'
  | 'aget_messages'
  | 'get_messages'
  | 'arun_thread'
  | 'run_thread'
  | 'arun_thread_stream'
  | 'run_thread_stream'
  | 'afile_retrieve'
  | 'file_retrieve'
  | 'afile_delete'
  | 'file_delete'
  | 'afile_list'
  | 'file_list'
  | 'acreate_file'
  | 'create_file'
  | 'afile_content'
  | 'file_content'
  | 'create_fine_tuning_job'
  | 'acreate_fine_tuning_job'
  | 'acancel_fine_tuning_job'
  | 'cancel_fine_tuning_job'
  | 'alist_fine_tuning_jobs'
  | 'list_fine_tuning_jobs'
  | 'aretrieve_fine_tuning_job'
  | 'retrieve_fine_tuning_job'
  | 'responses'
  | 'aresponses';

export type ConfigurableClientsideParamsCustomAuth = {
  api_base: string;
};

export type CreateCredentialItem = {
  credential_name: string;
  credential_info: Record<string, any>;
  credential_values?: Record<string, any> | null;
  model_id?: string | null;
};

export type CredentialItem = {
  credential_name: string;
  credential_info: Record<string, any>;
  credential_values: Record<string, any>;
};

export type DailySpendData = {
  /**
   * @format date
   */
  date: string;
  metrics: SpendMetrics;
  breakdown?: BreakdownMetrics;
};

export type DailySpendMetadata = {
  /**
   * @default 0
   */
  total_spend?: number;
  /**
   * @default 0
   */
  total_prompt_tokens?: number;
  /**
   * @default 0
   */
  total_completion_tokens?: number;
  /**
   * @default 0
   */
  total_api_requests?: number;
  /**
   * @default 1
   */
  page?: number;
  /**
   * @default 1
   */
  total_pages?: number;
  /**
   * @default false
   */
  has_more?: boolean;
};

/**
 * Default parameters to apply when a new user signs in via SSO or is created on the /user/new API endpoint
 */
export type DefaultInternalUserParams = {
  /**
   * Default role assigned to new users created
   *
   * @default internal_user
   */
  user_role?: ('proxy_admin' | 'proxy_admin_viewer' | 'internal_user' | 'internal_user_viewer') | null;
  /**
   * Default maximum budget (in USD) for new users created
   */
  max_budget?: number | null;
  /**
   * Default budget duration for new users (e.g. 'daily', 'weekly', 'monthly')
   */
  budget_duration?: string | null;
  /**
   * Default list of models that new users can access
   */
  models?: string[] | null;
};

/**
 * Delete multiple Customers
 */
export type DeleteCustomerRequest = {
  user_ids: string[];
};

export type DeleteOrganizationRequest = {
  organization_ids: string[];
};

export type DeleteTeamRequest = {
  team_ids: string[];
};

export type DeleteUserRequest = {
  user_ids: string[];
};

export type Deployment = {
  model_name: string;
  litellm_params: LiteLLMParams;
  model_info: ModelInfo;
} & {
  [key: string]: any;
};

export type ErrorResponse = {
  /**
   * @example {"error":{"code":"error_code","message":"Error message","param":"error_param","type":"error_type"}}
   */
  detail: Record<string, any>;
};

export type GenerateKeyRequest = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  /**
   * @default 0
   */
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  key?: string | null;
  budget_id?: string | null;
  tags?: string[] | null;
  enforced_params?: string[] | null;
  soft_budget?: number | null;
  send_invite_email?: boolean | null;
};

export type GenerateKeyResponse = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  /**
   * @default 0
   */
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  key: string;
  budget_id?: string | null;
  tags?: string[] | null;
  enforced_params?: string[] | null;
  key_name?: string | null;
  expires: string | null;
  token_id?: string | null;
  litellm_budget_table?: void | null;
  token?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type GuardrailInfoResponse = {
  guardrail_name: string;
  litellm_params: GuardrailLiteLLMParamsResponse;
  guardrail_info: Record<string, any> | null;
};

/**
 * The returned LiteLLM Params object for /guardrails/list
 */
export type GuardrailLiteLLMParamsResponse = {
  guardrail: string;
  mode: string | string[];
  /**
   * @default false
   */
  default_on?: boolean;
};

export type HTTPValidationError = {
  detail?: ValidationError[];
};

export type Hyperparameters = {
  batch_size?: string | number | null;
  learning_rate_multiplier?: string | number | null;
  n_epochs?: string | number | null;
};

export type IPAddress = {
  ip: string;
};

export type KeyHealthResponse = {
  key?: 'healthy' | 'unhealthy';
  logging_callbacks?: LoggingCallbackStatus | null;
};

export type KeyListResponseObject = {
  keys?: (string | UserAPIKeyAuth)[];
  total_count?: number | null;
  current_page?: number | null;
  total_pages?: number | null;
};

export type KeyRequest = {
  keys?: string[] | null;
  key_aliases?: string[] | null;
};

export type ListGuardrailsResponse = {
  guardrails: GuardrailInfoResponse[];
};

/**
 * Object returned by the /tools/list REST API route.
 */
export type ListMCPToolsRestAPIResponseObject = {
  name: string;
  description?: string | null;
  inputSchema: Record<string, any>;
  mcp_info?: MCPInfo | null;
} & {
  [key: string]: any;
};

export type LiteLLMFineTuningJobCreate = {
  model: string;
  training_file: string;
  hyperparameters?: Hyperparameters | null;
  suffix?: string | null;
  validation_file?: string | null;
  integrations?: string[] | null;
  seed?: number | null;
  custom_llm_provider: 'openai' | 'azure' | 'vertex_ai';
} & {
  [key: string]: any;
};

/**
 * Represents user-controllable params for a LiteLLM_BudgetTable record
 */
export type LiteLLMBudgetTable = {
  soft_budget?: number | null;
  max_budget?: number | null;
  max_parallel_requests?: number | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  model_max_budget?: Record<string, any> | null;
  budget_duration?: string | null;
};

export type LiteLLMEndUserTable = {
  user_id: string;
  blocked: boolean;
  alias?: string | null;
  /**
   * @default 0
   */
  spend?: number;
  allowed_model_region?: ('eu' | 'us') | null;
  default_model?: string | null;
  litellm_budget_table?: LiteLLMBudgetTable | null;
};

export type LiteLLMModelTable = {
  model_aliases?: Record<string, any> | string | null;
  created_by: string;
  updated_by: string;
};

/**
 * This is the table that track what organizations a user belongs to and users spend within the organization
 */
export type LiteLLMOrganizationMembershipTable = {
  user_id: string;
  organization_id: string;
  user_role?: string | null;
  /**
   * @default 0
   */
  spend?: number;
  budget_id?: string | null;
  /**
   * @format date-time
   */
  created_at: string;
  /**
   * @format date-time
   */
  updated_at: string;
  user?: void | null;
  litellm_budget_table?: LiteLLMBudgetTable | null;
};

/**
 * Represents user-controllable params for a LiteLLM_OrganizationTable record
 */
export type LiteLLMOrganizationTableUpdate = {
  organization_id?: string | null;
  organization_alias?: string | null;
  budget_id?: string | null;
  spend?: number | null;
  metadata?: Record<string, any> | null;
  models?: string[] | null;
  updated_by?: string | null;
};

/**
 * Returned by the /organization/info endpoint and /organization/list endpoint
 */
export type LiteLLMOrganizationTableWithMembers = {
  organization_id?: string | null;
  organization_alias?: string | null;
  budget_id: string;
  /**
   * @default 0
   */
  spend?: number;
  metadata?: Record<string, any> | null;
  models: string[];
  created_by: string;
  updated_by: string;
  members?: LiteLLMOrganizationMembershipTable[];
  teams?: LiteLLMTeamTable[];
  litellm_budget_table?: LiteLLMBudgetTable | null;
  /**
   * @format date-time
   */
  created_at: string;
  /**
   * @format date-time
   */
  updated_at: string;
};

/**
 * LiteLLM Params with 'model' requirement - used for completions
 */
export type LiteLLMParams = {
  api_key?: string | null;
  api_base?: string | null;
  api_version?: string | null;
  vertex_project?: string | null;
  vertex_location?: string | null;
  vertex_credentials?: Record<string, any> | string | null;
  region_name?: string | null;
  aws_access_key_id?: string | null;
  aws_secret_access_key?: string | null;
  aws_region_name?: string | null;
  watsonx_region_name?: string | null;
  custom_llm_provider?: string | null;
  tpm?: number | null;
  rpm?: number | null;
  timeout?: number | string | null;
  stream_timeout?: number | string | null;
  max_retries?: number | null;
  organization?: string | null;
  configurable_clientside_auth_params?: (string | ConfigurableClientsideParamsCustomAuth)[] | null;
  litellm_trace_id?: string | null;
  input_cost_per_token?: number | null;
  output_cost_per_token?: number | null;
  input_cost_per_second?: number | null;
  output_cost_per_second?: number | null;
  max_file_size_mb?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  /**
   * @default false
   */
  use_in_pass_through?: boolean | null;
  /**
   * @default false
   */
  merge_reasoning_content_in_choices?: boolean | null;
  model_info?: Record<string, any> | null;
  model: string;
} & {
  [key: string]: any;
};

export type LiteLLMSpendLogs = {
  request_id: string;
  api_key: string;
  /**
   * @default
   */
  model?: string | null;
  /**
   * @default
   */
  api_base?: string | null;
  call_type: string;
  /**
   * @default 0
   */
  spend?: number | null;
  /**
   * @default 0
   */
  total_tokens?: number | null;
  /**
   * @default 0
   */
  prompt_tokens?: number | null;
  /**
   * @default 0
   */
  completion_tokens?: number | null;
  startTime: string | string | null;
  endTime: string | string | null;
  /**
   * @default
   */
  user?: string | null;
  /**
   * @default {}
   */
  metadata?: void | null;
  /**
   * @default False
   */
  cache_hit?: string | null;
  cache_key?: string | null;
  request_tags?: void | null;
  requester_ip_address?: string | null;
  messages: string | any[] | Record<string, any> | null;
  response: string | any[] | Record<string, any> | null;
};

export type LiteLLMTeamMembership = {
  user_id: string;
  team_id: string;
  budget_id: string;
  litellm_budget_table: LiteLLMBudgetTable | null;
};

export type LiteLLMTeamTable = {
  team_alias?: string | null;
  team_id: string;
  organization_id?: string | null;
  admins?: any[];
  members?: any[];
  members_with_roles?: Member[];
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  models?: any[];
  /**
   * @default false
   */
  blocked?: boolean;
  spend?: number | null;
  max_parallel_requests?: number | null;
  budget_reset_at?: string | null;
  model_id?: number | null;
  litellm_model_table?: LiteLLMModelTable | null;
  created_at?: string | null;
};

export type LiteLLMUserTable = {
  user_id: string;
  max_budget?: number | null;
  /**
   * @default 0
   */
  spend?: number;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_spend?: Record<string, any> | null;
  user_email?: string | null;
  models?: any[];
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  user_role?: string | null;
  organization_memberships?: LiteLLMOrganizationMembershipTable[] | null;
  teams?: string[];
  sso_user_id?: string | null;
  budget_duration?: string | null;
  budget_reset_at?: string | null;
  metadata?: Record<string, any> | null;
};

export type LiteLLMVerificationToken = {
  token?: string | null;
  key_name?: string | null;
  key_alias?: string | null;
  /**
   * @default 0
   */
  spend?: number;
  max_budget?: number | null;
  expires?: string | string | null;
  models?: any[];
  /**
   * @default {}
   */
  aliases?: Record<string, any>;
  /**
   * @default {}
   */
  config?: Record<string, any>;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any>;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  budget_reset_at?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any>;
  /**
   * @default {}
   */
  model_spend?: Record<string, any>;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any>;
  /**
   * @default false
   */
  soft_budget_cooldown?: boolean;
  blocked?: boolean | null;
  litellm_budget_table?: Record<string, any> | null;
  org_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

/**
 * Admin Roles:
 * PROXY_ADMIN: admin over the platform
 * PROXY_ADMIN_VIEW_ONLY: can login, view all own keys, view all spend
 * ORG_ADMIN: admin over a specific organization, can create teams, users only within their organization
 *
 * Internal User Roles:
 * INTERNAL_USER: can login, view/create/delete their own keys, view their spend
 * INTERNAL_USER_VIEW_ONLY: can login, view their own keys, view their own spend
 *
 *
 * Team Roles:
 * TEAM: used for JWT auth
 *
 *
 * Customer Roles:
 * CUSTOMER: External users -> these are customers
 */
export type LitellmUserRoles =
  | 'proxy_admin'
  | 'proxy_admin_viewer'
  | 'org_admin'
  | 'internal_user'
  | 'internal_user_viewer'
  | 'team'
  | 'customer';

export type LoggingCallbackStatus = {
  callbacks?: string[];
  status?: 'healthy' | 'unhealthy';
  details?: string | null;
};

export type MCPInfo = {
  server_name?: string;
  logo_url?: string | null;
};

export type Member = {
  user_id?: string | null;
  user_email?: string | null;
  role: 'admin' | 'user';
};

export type ModelInfo = {
  id: string | null;
  /**
   * @default false
   */
  db_model?: boolean;
  updated_at?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  base_model?: string | null;
  tier?: ('free' | 'paid') | null;
  team_id?: string | null;
  team_public_model_name?: string | null;
} & {
  [key: string]: any;
};

export type ModelInfoDelete = {
  id: string;
};

/**
 * Create a new customer, allocate a budget to them
 */
export type NewCustomerRequest = {
  budget_id?: string | null;
  /**
   * Requests will fail if this budget (in USD) is exceeded.
   */
  max_budget?: number | null;
  /**
   * Requests will NOT fail if this is exceeded. Will fire alerting though.
   */
  soft_budget?: number | null;
  /**
   * Max concurrent requests allowed for this budget id.
   */
  max_parallel_requests?: number | null;
  /**
   * Max tokens per minute, allowed for this budget id.
   */
  tpm_limit?: number | null;
  /**
   * Max requests per minute, allowed for this budget id.
   */
  rpm_limit?: number | null;
  /**
   * Max duration budget should be set for (e.g. '1hr', '1d', '28d')
   */
  budget_duration?: string | null;
  /**
   * Max budget for each model (e.g. {'gpt-4o': {'max_budget': '0.0000001', 'budget_duration': '1d', 'tpm_limit': 1000, 'rpm_limit': 1000}})
   */
  model_max_budget?: {
    [key: string]: BudgetConfig;
  } | null;
  user_id: string;
  alias?: string | null;
  /**
   * @default false
   */
  blocked?: boolean;
  allowed_model_region?: ('eu' | 'us') | null;
  default_model?: string | null;
};

export type NewOrganizationRequest = {
  soft_budget?: number | null;
  max_budget?: number | null;
  max_parallel_requests?: number | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  model_max_budget?: Record<string, any> | null;
  budget_duration?: string | null;
  organization_id?: string | null;
  organization_alias: string;
  models?: any[];
  budget_id?: string | null;
  metadata?: Record<string, any> | null;
};

export type NewOrganizationResponse = {
  organization_id: string;
  organization_alias?: string | null;
  budget_id: string;
  /**
   * @default 0
   */
  spend?: number;
  metadata?: Record<string, any> | null;
  models: string[];
  created_by: string;
  updated_by: string;
  /**
   * @format date-time
   */
  created_at: string;
  /**
   * @format date-time
   */
  updated_at: string;
};

export type NewTeamRequest = {
  team_alias?: string | null;
  team_id?: string | null;
  organization_id?: string | null;
  admins?: any[];
  members?: any[];
  members_with_roles?: Member[];
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  models?: any[];
  /**
   * @default false
   */
  blocked?: boolean;
  model_aliases?: Record<string, any> | null;
  tags?: any[] | null;
  guardrails?: string[] | null;
};

export type NewUserRequest = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  /**
   * @default 0
   */
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  user_email?: string | null;
  user_alias?: string | null;
  user_role?: ('proxy_admin' | 'proxy_admin_viewer' | 'internal_user' | 'internal_user_viewer') | null;
  teams?: any[] | null;
  /**
   * @default true
   */
  auto_create_key?: boolean;
  send_invite_email?: boolean | null;
};

export type NewUserResponse = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  /**
   * @default 0
   */
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  key: string;
  budget_id?: string | null;
  tags?: string[] | null;
  enforced_params?: string[] | null;
  key_name?: string | null;
  expires: string | null;
  token_id?: string | null;
  litellm_budget_table?: void | null;
  token?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  user_email?: string | null;
  user_role?: ('proxy_admin' | 'proxy_admin_viewer' | 'internal_user' | 'internal_user_viewer') | null;
  teams?: any[] | null;
  user_alias?: string | null;
};

export type OrgMember = {
  user_id?: string | null;
  user_email?: string | null;
  role: 'org_admin' | 'internal_user' | 'internal_user_viewer';
};

export type OrganizationAddMemberResponse = {
  organization_id: string;
  updated_users: LiteLLMUserTable[];
  updated_organization_memberships: LiteLLMOrganizationMembershipTable[];
};

export type OrganizationMemberAddRequest = {
  member: OrgMember[] | OrgMember;
  organization_id: string;
  max_budget_in_organization?: number | null;
};

export type OrganizationMemberDeleteRequest = {
  user_id?: string | null;
  user_email?: string | null;
  organization_id: string;
};

export type OrganizationMemberUpdateRequest = {
  user_id?: string | null;
  user_email?: string | null;
  organization_id: string;
  max_budget_in_organization?: number | null;
  role?: LitellmUserRoles | null;
};

export type OrganizationRequest = {
  organizations: string[];
};

export type PassThroughEndpointResponse = {
  endpoints: PassThroughGenericEndpoint[];
};

export type PassThroughGenericEndpoint = {
  /**
   * The route to be added to the LiteLLM Proxy Server.
   */
  path: string;
  /**
   * The URL to which requests for this path should be forwarded.
   */
  target: string;
  /**
   * Key-value pairs of headers to be forwarded with the request. You can set any key value pair here and it will be forwarded to your target endpoint
   */
  headers: Record<string, any>;
};

/**
 * Complete provider budget configuration and status.
 * Maps provider names to their budget configs.
 */
export type ProviderBudgetResponse = {
  /**
   * @default {}
   */
  providers?: {
    [key: string]: ProviderBudgetResponseObject;
  };
};

/**
 * Configuration for a single provider's budget settings
 */
export type ProviderBudgetResponseObject = {
  budget_limit: number | null;
  time_period: string | null;
  /**
   * @default 0
   */
  spend?: number | null;
  budget_reset_at?: string | null;
};

export type RawRequestTypedDict = {
  raw_request_api_base?: string | null;
  raw_request_body?: Record<string, any> | null;
  raw_request_headers?: Record<string, any> | null;
  error?: string | null;
};

export type RegenerateKeyRequest = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  key?: string | null;
  budget_id?: string | null;
  tags?: string[] | null;
  enforced_params?: string[] | null;
  soft_budget?: number | null;
  send_invite_email?: boolean | null;
  new_master_key?: string | null;
};

export type SpendAnalyticsPaginatedResponse = {
  results: DailySpendData[];
  metadata?: DailySpendMetadata;
};

export type SpendCalculateRequest = {
  model?: string | null;
  messages?: any[] | null;
  completion_response?: Record<string, any> | null;
};

export type SpendMetrics = {
  /**
   * @default 0
   */
  spend?: number;
  /**
   * @default 0
   */
  prompt_tokens?: number;
  /**
   * @default 0
   */
  completion_tokens?: number;
  /**
   * @default 0
   */
  total_tokens?: number;
  /**
   * @default 0
   */
  api_requests?: number;
};

export type TeamAddMemberResponse = {
  team_alias?: string | null;
  team_id: string;
  organization_id?: string | null;
  admins?: any[];
  members?: any[];
  members_with_roles?: Member[];
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  models?: any[];
  /**
   * @default false
   */
  blocked?: boolean;
  spend?: number | null;
  max_parallel_requests?: number | null;
  budget_reset_at?: string | null;
  model_id?: number | null;
  litellm_model_table?: LiteLLMModelTable | null;
  created_at?: string | null;
  updated_users: LiteLLMUserTable[];
  updated_team_memberships: LiteLLMTeamMembership[];
};

export type TeamMemberAddRequest = {
  member: Member[] | Member;
  team_id: string;
  max_budget_in_team?: number | null;
};

export type TeamMemberDeleteRequest = {
  user_id?: string | null;
  user_email?: string | null;
  team_id: string;
};

export type TeamMemberUpdateRequest = {
  user_id?: string | null;
  user_email?: string | null;
  team_id: string;
  max_budget_in_team?: number | null;
  role?: ('admin' | 'user') | null;
};

export type TeamMemberUpdateResponse = {
  user_id: string;
  user_email?: string | null;
  team_id: string;
  max_budget_in_team?: number | null;
};

/**
 * Request to add models to a team
 */
export type TeamModelAddRequest = {
  team_id: string;
  models: string[];
};

/**
 * Request to delete models from a team
 */
export type TeamModelDeleteRequest = {
  team_id: string;
  models: string[];
};

export type TokenCountRequest = {
  model: string;
  prompt?: string | null;
  messages?: Record<string, any>[] | null;
};

export type TokenCountResponse = {
  total_tokens: number;
  request_model: string;
  model_used: string;
  tokenizer_type: string;
};

export type TransformRequestBody = {
  call_type: CallTypes;
  request_body: Record<string, any>;
};

/**
 * Update a Customer, use this to update customer budgets etc
 */
export type UpdateCustomerRequest = {
  user_id: string;
  alias?: string | null;
  /**
   * @default false
   */
  blocked?: boolean;
  max_budget?: number | null;
  budget_id?: string | null;
  allowed_model_region?: ('eu' | 'us') | null;
  default_model?: string | null;
};

export type UpdateKeyRequest = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  key: string;
  budget_id?: string | null;
  tags?: string[] | null;
  enforced_params?: string[] | null;
  temp_budget_increase?: number | null;
  temp_budget_expiry?: string | null;
};

/**
 * UpdateTeamRequest, used by /team/update when you need to update a team
 *
 * team_id: str
 * team_alias: Optional[str] = None
 * organization_id: Optional[str] = None
 * metadata: Optional[dict] = None
 * tpm_limit: Optional[int] = None
 * rpm_limit: Optional[int] = None
 * max_budget: Optional[float] = None
 * models: Optional[list] = None
 * blocked: Optional[bool] = None
 * budget_duration: Optional[str] = None
 * guardrails: Optional[List[str]] = None
 */
export type UpdateTeamRequest = {
  team_id: string;
  team_alias?: string | null;
  organization_id?: string | null;
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  max_budget?: number | null;
  models?: any[] | null;
  blocked?: boolean | null;
  budget_duration?: string | null;
  tags?: any[] | null;
  model_aliases?: Record<string, any> | null;
  guardrails?: string[] | null;
};

export type UpdateUserRequest = {
  key_alias?: string | null;
  duration?: string | null;
  models?: any[] | null;
  spend?: number | null;
  max_budget?: number | null;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  metadata?: Record<string, any> | null;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  config?: Record<string, any> | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any> | null;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any> | null;
  model_rpm_limit?: Record<string, any> | null;
  model_tpm_limit?: Record<string, any> | null;
  guardrails?: string[] | null;
  blocked?: boolean | null;
  /**
   * @default {}
   */
  aliases?: Record<string, any> | null;
  password?: string | null;
  user_email?: string | null;
  user_role?: ('proxy_admin' | 'proxy_admin_viewer' | 'internal_user' | 'internal_user_viewer') | null;
};

/**
 * Return the row in the db
 */
export type UserAPIKeyAuth = {
  token?: string | null;
  key_name?: string | null;
  key_alias?: string | null;
  /**
   * @default 0
   */
  spend?: number;
  max_budget?: number | null;
  expires?: string | string | null;
  models?: any[];
  /**
   * @default {}
   */
  aliases?: Record<string, any>;
  /**
   * @default {}
   */
  config?: Record<string, any>;
  user_id?: string | null;
  team_id?: string | null;
  max_parallel_requests?: number | null;
  /**
   * @default {}
   */
  metadata?: Record<string, any>;
  tpm_limit?: number | null;
  rpm_limit?: number | null;
  budget_duration?: string | null;
  budget_reset_at?: string | null;
  allowed_cache_controls?: any[] | null;
  /**
   * @default {}
   */
  permissions?: Record<string, any>;
  /**
   * @default {}
   */
  model_spend?: Record<string, any>;
  /**
   * @default {}
   */
  model_max_budget?: Record<string, any>;
  /**
   * @default false
   */
  soft_budget_cooldown?: boolean;
  blocked?: boolean | null;
  litellm_budget_table?: Record<string, any> | null;
  org_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  team_spend?: number | null;
  team_alias?: string | null;
  team_tpm_limit?: number | null;
  team_rpm_limit?: number | null;
  team_max_budget?: number | null;
  team_models?: any[];
  /**
   * @default false
   */
  team_blocked?: boolean;
  soft_budget?: number | null;
  team_model_aliases?: Record<string, any> | null;
  team_member_spend?: number | null;
  team_member?: Member | null;
  team_metadata?: Record<string, any> | null;
  end_user_id?: string | null;
  end_user_tpm_limit?: number | null;
  end_user_rpm_limit?: number | null;
  end_user_max_budget?: number | null;
  last_refreshed_at?: number | null;
  api_key?: string | null;
  user_role?: LitellmUserRoles | null;
  allowed_model_region?: ('eu' | 'us') | null;
  parent_otel_span?: void | null;
  rpm_limit_per_model?: {
    [key: string]: number;
  } | null;
  tpm_limit_per_model?: {
    [key: string]: number;
  } | null;
  user_tpm_limit?: number | null;
  user_rpm_limit?: number | null;
  user_email?: string | null;
};

export type ValidationError = {
  loc: (string | number)[];
  msg: string;
  type: string;
};

export type UpdateDeployment = {
  model_name?: string | null;
  litellm_params?: UpdateLiteLLMParams | null;
  model_info?: ModelInfo | null;
};

export type UpdateLiteLLMParams = {
  api_key?: string | null;
  api_base?: string | null;
  api_version?: string | null;
  vertex_project?: string | null;
  vertex_location?: string | null;
  vertex_credentials?: Record<string, any> | string | null;
  region_name?: string | null;
  aws_access_key_id?: string | null;
  aws_secret_access_key?: string | null;
  aws_region_name?: string | null;
  watsonx_region_name?: string | null;
  custom_llm_provider?: string | null;
  tpm?: number | null;
  rpm?: number | null;
  timeout?: number | string | null;
  stream_timeout?: number | string | null;
  max_retries?: number | null;
  organization?: string | null;
  configurable_clientside_auth_params?: (string | ConfigurableClientsideParamsCustomAuth)[] | null;
  litellm_trace_id?: string | null;
  input_cost_per_token?: number | null;
  output_cost_per_token?: number | null;
  input_cost_per_second?: number | null;
  output_cost_per_second?: number | null;
  max_file_size_mb?: number | null;
  max_budget?: number | null;
  budget_duration?: string | null;
  /**
   * @default false
   */
  use_in_pass_through?: boolean | null;
  /**
   * @default false
   */
  merge_reasoning_content_in_choices?: boolean | null;
  model_info?: Record<string, any> | null;
  model?: string | null;
} & {
  [key: string]: any;
};
