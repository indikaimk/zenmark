import {
  Diagram,
  ModelingModule,
  MoveModule,
  SelectionModule,
  ConnectModule,
  CreateModule,
  BendpointsModule,
  ResizeModule,
  SnappingModule,
  GridSnappingModule,
  KeyboardModule,
  KeyboardMoveSelectionModule,
  OutlineModule,
  ContextPadModule,
  RulesModule,
  ZoomScrollModule,
  MoveCanvasModule,
  BaseRenderer,
  componentsToPath,
  BaseLayouter,
  RuleProvider,
  repairConnection,
  getMid,
  svgAppend,
  svgAttr,
  svgCreate
} from "diagram_js_vendor";

const THEMES = {
  slate: {
    fill: '#ffffff',
    headerFill: '#f1f5f9',
    stroke: '#475569',
    badgeText: '#475569',
    titleText: '#0f172a'
  },
  blue: {
    fill: '#ffffff',
    headerFill: '#eff6ff',
    stroke: '#2563eb',
    badgeText: '#1d4ed8',
    titleText: '#0f172a'
  },
  emerald: {
    fill: '#ffffff',
    headerFill: '#ecfdf5',
    stroke: '#059669',
    badgeText: '#047857',
    titleText: '#0f172a'
  },
  amber: {
    fill: '#ffffff',
    headerFill: '#fffbeb',
    stroke: '#d97706',
    badgeText: '#b45309',
    titleText: '#0f172a'
  },
  rose: {
    fill: '#ffffff',
    headerFill: '#fff1f2',
    stroke: '#C21057',
    badgeText: '#C21057',
    titleText: '#0f172a'
  },
  purple: {
    fill: '#ffffff',
    headerFill: '#f5f3ff',
    stroke: '#7c3aed',
    badgeText: '#6d28d9',
    titleText: '#0f172a'
  }
};

const PROVIDER_META = {
  aws: { label: 'AWS', bg: '#fff7ed', border: '#fdba74', text: '#c2410c' },
  gcp: { label: 'GCP', bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  azure: { label: 'AZURE', bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1' },
  k8s: { label: 'K8S', bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' },
  general: { label: 'CORE', bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' }
};

/**
 * Crisp 24x24 vector SVG inner markup for Cloud & Kubernetes architecture icons.
 * Rendered inline inside both the left sidebar palette and diagram-js SVG nodes
 * so 2x Retina PNG export works with zero external network calls or CORS taint.
 */
export const ICON_SVG_PATHS = {
  // General / Core
  gen_service: `<rect x="3" y="4" width="18" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="18" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/><line x1="11" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="11" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  gen_database: `<ellipse cx="12" cy="6" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="currentColor" stroke-width="2"/>`,
  gen_queue: `<rect x="3" y="6" width="18" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="9" x2="8" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="9" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15.5 10l2.5 2-2.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  gen_client: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="3.5" y1="9" x2="20.5" y2="9" stroke="currentColor" stroke-width="1.8"/><line x1="3.5" y1="15" x2="20.5" y2="15" stroke="currentColor" stroke-width="1.8"/>`,
  gen_gateway: `<polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 12h7M13 9.5l2.5 2.5-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  gen_group: `<rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2.5"/><rect x="6" y="7" width="6" height="3.5" rx="1" fill="currentColor"/>`,

  // AWS Icons
  aws_lambda: `<path d="M6.5 19L11.8 7.5M9.2 5h3.2l5.2 14h2.2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`,
  aws_ec2: `<rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.8" fill="currentColor"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  aws_ecs: `<path d="M12 3L4 7.5v9L12 21l8-4.5v-9L12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="8" y="8.5" width="8" height="3" rx="0.8" fill="currentColor"/><rect x="8" y="13" width="8" height="3" rx="0.8" fill="currentColor"/>`,
  aws_eks: `<polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.5v3M12 15.5v3M6.4 8.8l2.6 1.5M15 13.7l2.6 1.5M17.6 8.8L15 10.3M9 13.7l-2.6 1.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
  aws_s3: `<path d="M5 7l1.5 12.5a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8L19 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><ellipse cx="12" cy="7" rx="7" ry="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5.5 7C7 3.5 17 3.5 18.5 7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="13.5" r="1.4" fill="currentColor"/><circle cx="14" cy="13.5" r="1.4" fill="currentColor"/><circle cx="12" cy="16.8" r="1.4" fill="currentColor"/>`,
  aws_rds: `<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 5.5v13c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-13" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 10c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8M4.5 14.5c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  aws_aurora: `<ellipse cx="11" cy="6" rx="6.5" ry="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 6v11.5c0 1.38 2.9 2.5 6.5 2.5s6.5-1.12 6.5-2.5V11" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 3l1 2.5L21.5 6.5 19 7.5 18 10l-1-2.5-2.5-1 2.5-1L18 3z" fill="currentColor"/>`,
  aws_dynamodb: `<path d="M13.5 3L7 13h5l-1.5 8L18 11h-5l.5-8z" fill="currentColor"/>`,
  aws_elasticache: `<polygon points="12,3 21,8 21,16 12,21 3,16 3,8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.8 7.5L9 13h3.2l-.7 3.5L15.5 11h-3.2l.5-3.5z" fill="currentColor"/>`,
  aws_cloudfront: `<circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 12h15M12 4.5c2.2 2.2 2.2 12.8 0 15M12 4.5c-2.2 2.2-2.2 12.8 0 15" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18.5" cy="6.5" r="2.2" fill="currentColor"/><circle cx="5.5" cy="17.5" r="2.2" fill="currentColor"/>`,
  aws_route53: `<path d="M12 3l8 4v5.5c0 5-3.4 7.8-8 9.5-4.6-1.7-8-4.5-8-9.5V7l8-4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 10.5h7m-7 3.5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  aws_apigw: `<path d="M7 6L3.5 12 7 18M17 6l3.5 6-3.5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="8.5" r="1.5" fill="currentColor"/><circle cx="12" cy="15.5" r="1.5" fill="currentColor"/><line x1="12" y1="8.5" x2="12" y2="15.5" stroke="currentColor" stroke-width="1.8"/>`,
  aws_alb: `<circle cx="5.5" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18.5" cy="6.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18.5" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18.5" cy="17.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8M8 11l8-4.5M8 13l8 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  aws_sqs: `<rect x="3" y="6.5" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6" y="9.5" width="2.2" height="5" rx="0.5" fill="currentColor"/><rect x="9.5" y="9.5" width="2.2" height="5" rx="0.5" fill="currentColor"/><rect x="13" y="9.5" width="2.2" height="5" rx="0.5" fill="currentColor"/><path d="M18.5 9.5L21.5 12l-3 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  aws_sns: `<circle cx="6" cy="12" r="2.8" fill="currentColor"/><circle cx="18.5" cy="6" r="2" fill="currentColor"/><circle cx="19.5" cy="12" r="2" fill="currentColor"/><circle cx="18.5" cy="18" r="2" fill="currentColor"/><path d="M8.5 10.8L16.5 6.8M8.8 12h8.5M8.5 13.2l8 4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  aws_eventbridge: `<circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/><circle cx="12" cy="20" r="1.6" fill="currentColor"/><circle cx="4.5" cy="8" r="1.6" fill="currentColor"/><circle cx="19.5" cy="8" r="1.6" fill="currentColor"/><circle cx="4.5" cy="16" r="1.6" fill="currentColor"/><circle cx="19.5" cy="16" r="1.6" fill="currentColor"/><path d="M12 5.6v2.9M12 15.5v2.9M6 8.8l3 1.7M15 13.5l3 1.7M18 8.8l-3 1.7M9 13.5l-3 1.7" stroke="currentColor" stroke-width="1.7"/>`,
  aws_kinesis: `<path d="M3 8c4-3 6 3 10 0s4-3 8 0M3 12c4-3 6 3 10 0s4-3 8 0M3 16c4-3 6 3 10 0s4-3 8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  aws_iam: `<path d="M12 3L4.5 6.5v5.5c0 4.8 3.2 7.7 7.5 9.2 4.3-1.5 7.5-4.4 7.5-9.2V6.5L12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10.5" r="2" fill="currentColor"/><path d="M12 12.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  aws_cloudwatch: `<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 12l2-2.5 2 3 2.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  aws_bedrock: `<polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 7l1.2 2.8L16 11l-2.8 1.2L12 15l-1.2-2.8L8 11l2.8-1.2L12 7z" fill="currentColor"/>`,

  // GCP Icons
  gcp_run: `<path d="M5 6.5l8 5.5-8 5.5V6.5z" fill="currentColor"/><path d="M13 6.5l7 5.5-7 5.5V6.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  gcp_gce: `<rect x="6.5" y="6.5" width="11" height="11" rx="1.8" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/><path d="M9 3.5v3M15 3.5v3M9 17.5v3M15 17.5v3M3.5 9h3M3.5 15h3M17.5 9h3M17.5 15h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  gcp_functions: `<path d="M8 6L4 12l4 6M16 6l4 6-4 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>`,
  gcp_gke: `<polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 5v4M12 15v4M6 8.5l3.5 2M14.5 13.5l3.5 2M18 8.5l-3.5 2M9.5 13.5L6 15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  gcp_storage: `<polygon points="12,3 20.5,7.8 20.5,16.2 12,21 3.5,16.2 3.5,7.8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="7.5" y1="10" x2="16.5" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="7.5" y1="14" x2="16.5" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  gcp_sql: `<ellipse cx="12" cy="6" rx="7.5" ry="2.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 6v12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8" fill="none" stroke="currentColor" stroke-width="2"/>`,
  gcp_spanner: `<circle cx="12" cy="5.5" r="2.5" fill="currentColor"/><circle cx="6" cy="17.5" r="2.5" fill="currentColor"/><circle cx="18" cy="17.5" r="2.5" fill="currentColor"/><path d="M12 8v5M12 13L7.8 16M12 13l4.2 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  gcp_firestore: `<path d="M12 3L4 7.5l8 4.5 8-4.5L12 3z" fill="currentColor"/><path d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  gcp_bigquery: `<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16.2 16.2L21 21" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><line x1="8.5" y1="13.5" x2="8.5" y2="10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="11" y1="13.5" x2="11" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="13.5" y1="13.5" x2="13.5" y2="9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  gcp_memorystore: `<rect x="4" y="5" width="16" height="4.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="13.5" width="16" height="4.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.5" cy="7.2" r="1" fill="currentColor"/><circle cx="7.5" cy="15.7" r="1" fill="currentColor"/>`,
  gcp_lb: `<circle cx="12" cy="5" r="2.3" fill="currentColor"/><circle cx="5.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18.5" cy="18.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v8.5M12 11.5L5.5 16M12 11.5L18.5 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  gcp_pubsub: `<circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="4" r="1.8" fill="currentColor"/><circle cx="19" cy="8" r="1.8" fill="currentColor"/><circle cx="19" cy="16" r="1.8" fill="currentColor"/><circle cx="12" cy="20" r="1.8" fill="currentColor"/><circle cx="5" cy="16" r="1.8" fill="currentColor"/><circle cx="5" cy="8" r="1.8" fill="currentColor"/><path d="M12 5.8v3M17.4 9l-2.6 1.5M17.4 15l-2.6-1.5M12 18.2v-3M6.6 15l2.6-1.5M6.6 9l2.6 1.5" stroke="currentColor" stroke-width="1.8"/>`,
  gcp_dataflow: `<circle cx="5" cy="12" r="2.2" fill="currentColor"/><circle cx="12" cy="6.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17.5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="12" r="2.2" fill="currentColor"/><path d="M7 10.8l3.2-3M7 13.2l3.2 3M13.8 7.8l3.2 3M13.8 16.2l3.2-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  gcp_vertex: `<polygon points="12,3 20.5,18.5 3.5,18.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="2.3" fill="currentColor"/><line x1="12" y1="3" x2="12" y2="10.7" stroke="currentColor" stroke-width="1.6"/>`,

  // Azure Icons
  az_vm: `<rect x="3.5" y="4.5" width="17" height="11.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="19.5" x2="16" y2="19.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="19.5" stroke="currentColor" stroke-width="2"/>`,
  az_app_service: `<rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3.5" y1="9" x2="20.5" y2="9" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 14l2 2 3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  az_functions: `<path d="M13.2 3.5L7.5 12.5h4.5l-1.2 8 6.2-9.5h-4.5l.7-7.5z" fill="currentColor"/>`,
  az_aks: `<polygon points="12,2.5 20.5,7.2 20.5,16.8 12,21.5 3.5,16.8 3.5,7.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>`,
  az_container_apps: `<rect x="4" y="10" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="10" width="7" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8.5" y="4" width="7" height="7" rx="1.4" fill="currentColor"/>`,
  az_blob: `<rect x="4" y="4" width="16" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7.5" y="7.5" width="4" height="4" rx="0.8" fill="currentColor"/><rect x="12.5" y="7.5" width="4" height="4" rx="0.8" fill="currentColor"/><rect x="7.5" y="12.5" width="9" height="4" rx="0.8" fill="currentColor"/>`,
  az_cosmos: `<circle cx="12" cy="12" r="4.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-28 12 12)" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="19" cy="7.5" r="1.6" fill="currentColor"/>`,
  az_service_bus: `<rect x="3" y="5.5" width="18" height="4.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="18" height="4.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8m-2-1.8L16 12l-2 1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  az_openai: `<path d="M12 3.5l2.1 5.4 5.4 2.1-5.4 2.1L12 18.5l-2.1-5.4-5.4-2.1 5.4-2.1L12 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/>`,

  // Kubernetes (K8s) Icons
  k8s_pod: `<path d="M12 3.5L4.5 7.8v8.4L12 20.5l7.5-4.3V7.8L12 3.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4.5 7.8L12 12l7.5-4.2M12 12v8.5" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  k8s_deploy: `<rect x="4" y="7" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4h10a1.5 1.5 0 0 1 1.5 1.5v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 12.5h4M9.5 10.5v4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  k8s_sts: `<path d="M9 4.5L3.5 7.8v6.8L9 17.8l5.5-3.2V7.8L9 4.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><ellipse cx="16.5" cy="11" rx="4" ry="1.8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12.5 11v6.5c0 1 1.8 1.8 4 1.8s4-.8 4-1.8V11" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  k8s_svc: `<circle cx="12" cy="5.5" r="2.2" fill="currentColor"/><circle cx="6" cy="18" r="2.2" fill="currentColor"/><circle cx="12" cy="18" r="2.2" fill="currentColor"/><circle cx="18" cy="18" r="2.2" fill="currentColor"/><path d="M12 7.8v4.2M6 15.8V12h12v3.8M12 12v3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
  k8s_ing: `<rect x="9" y="4" width="11" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h10m-3-3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  k8s_cm: `<rect x="4.5" y="3.5" width="15" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="8.5" x2="16" y2="8.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><line x1="8" y1="12.5" x2="16" y2="12.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><line x1="8" y1="16.5" x2="13" y2="16.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
  k8s_secret: `<rect x="5" y="10.5" width="14" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/>`,
  k8s_pv: `<ellipse cx="12" cy="6.5" rx="7.5" ry="2.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 6.5v11c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-11" fill="none" stroke="currentColor" stroke-width="2"/>`,
  k8s_cluster: `<circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`
};

/**
 * Searchable Catalog of General, AWS, GCP, Azure, and Kubernetes Architecture Components
 */
export const CLOUD_CATALOG = [
  // ======================== GENERAL / CORE SHAPES ========================
  { id: 'core_service', provider: 'general', category: 'Core Shapes', label: 'Service / API', subtitle: 'Compute', shapeType: 'service', theme: 'slate', iconKey: '', iconColor: '#475569', keywords: 'service api compute microservice app backend' },
  { id: 'core_database', provider: 'general', category: 'Core Shapes', label: 'Database / Store', subtitle: 'Storage', shapeType: 'database', theme: 'blue', iconKey: '', iconColor: '#2563eb', keywords: 'database sql nosql storage cylinder' },
  { id: 'core_queue', provider: 'general', category: 'Core Shapes', label: 'Queue / Stream', subtitle: 'Messaging', shapeType: 'queue', theme: 'amber', iconKey: '', iconColor: '#d97706', keywords: 'queue kafka stream event bus pipe' },
  { id: 'core_client', provider: 'general', category: 'Core Shapes', label: 'Client / External', subtitle: 'Ingress', shapeType: 'client', theme: 'rose', iconKey: '', iconColor: '#C21057', keywords: 'client user browser mobile edge external' },
  { id: 'core_gateway', provider: 'general', category: 'Core Shapes', label: 'Router / Gateway', subtitle: 'Network', shapeType: 'gateway', theme: 'emerald', iconKey: '', iconColor: '#059669', keywords: 'router load balancer gateway proxy waf' },
  { id: 'core_group', provider: 'general', category: 'Core Shapes', label: 'VPC / Zone Boundary', subtitle: 'Boundary', shapeType: 'group', theme: 'slate', iconKey: '', iconColor: '#475569', keywords: 'vpc subnet zone cluster boundary group region' },

  // ======================== AMAZON WEB SERVICES (AWS) ========================
  { id: 'aws_ec2', provider: 'aws', category: 'Compute', label: 'Amazon EC2', subtitle: 'Compute VM', shapeType: 'service', theme: 'amber', iconKey: 'aws_ec2', iconColor: '#ED7100', keywords: 'aws ec2 instance virtual machine compute server' },
  { id: 'aws_lambda', provider: 'aws', category: 'Compute', label: 'AWS Lambda', subtitle: 'Serverless', shapeType: 'service', theme: 'amber', iconKey: 'aws_lambda', iconColor: '#ED7100', keywords: 'aws lambda serverless function faas compute' },
  { id: 'aws_ecs', provider: 'aws', category: 'Compute', label: 'Amazon ECS / Fargate', subtitle: 'Containers', shapeType: 'service', theme: 'amber', iconKey: 'aws_ecs', iconColor: '#ED7100', keywords: 'aws ecs fargate container docker compute' },
  { id: 'aws_eks', provider: 'aws', category: 'Compute', label: 'Amazon EKS', subtitle: 'Kubernetes', shapeType: 'service', theme: 'amber', iconKey: 'aws_eks', iconColor: '#ED7100', keywords: 'aws eks kubernetes k8s cluster container' },

  { id: 'aws_s3', provider: 'aws', category: 'Storage & Database', label: 'Amazon S3', subtitle: 'Object Storage', shapeType: 'service', theme: 'emerald', iconKey: 'aws_s3', iconColor: '#3F8624', keywords: 'aws s3 bucket object storage blob' },
  { id: 'aws_rds', provider: 'aws', category: 'Storage & Database', label: 'Amazon RDS', subtitle: 'Relational DB', shapeType: 'service', theme: 'blue', iconKey: 'aws_rds', iconColor: '#3B48CC', keywords: 'aws rds postgres mysql sql database' },
  { id: 'aws_aurora', provider: 'aws', category: 'Storage & Database', label: 'Amazon Aurora', subtitle: 'Cloud-Native SQL', shapeType: 'service', theme: 'blue', iconKey: 'aws_aurora', iconColor: '#3B48CC', keywords: 'aws aurora sql relational database cluster' },
  { id: 'aws_dynamodb', provider: 'aws', category: 'Storage & Database', label: 'Amazon DynamoDB', subtitle: 'NoSQL Store', shapeType: 'service', theme: 'blue', iconKey: 'aws_dynamodb', iconColor: '#3B48CC', keywords: 'aws dynamodb nosql key value table database' },
  { id: 'aws_elasticache', provider: 'aws', category: 'Storage & Database', label: 'Amazon ElastiCache', subtitle: 'Redis / Cache', shapeType: 'service', theme: 'blue', iconKey: 'aws_elasticache', iconColor: '#3B48CC', keywords: 'aws elasticache redis memcached cache memory' },

  { id: 'aws_cloudfront', provider: 'aws', category: 'Networking & Edge', label: 'Amazon CloudFront', subtitle: 'Global CDN', shapeType: 'service', theme: 'purple', iconKey: 'aws_cloudfront', iconColor: '#8C4FFF', keywords: 'aws cloudfront cdn edge distribution cache' },
  { id: 'aws_route53', provider: 'aws', category: 'Networking & Edge', label: 'Amazon Route 53', subtitle: 'Managed DNS', shapeType: 'service', theme: 'purple', iconKey: 'aws_route53', iconColor: '#8C4FFF', keywords: 'aws route53 route 53 dns domain routing' },
  { id: 'aws_apigw', provider: 'aws', category: 'Networking & Edge', label: 'Amazon API Gateway', subtitle: 'API Management', shapeType: 'service', theme: 'purple', iconKey: 'aws_apigw', iconColor: '#8C4FFF', keywords: 'aws api gateway rest websocket http' },
  { id: 'aws_alb', provider: 'aws', category: 'Networking & Edge', label: 'Elastic Load Balancing', subtitle: 'ALB / NLB', shapeType: 'service', theme: 'purple', iconKey: 'aws_alb', iconColor: '#8C4FFF', keywords: 'aws alb elb nlb load balancer traffic' },
  { id: 'aws_vpc', provider: 'aws', category: 'Networking & Edge', label: 'AWS VPC Boundary', subtitle: 'Virtual Network', shapeType: 'group', theme: 'purple', iconKey: 'gen_group', iconColor: '#8C4FFF', keywords: 'aws vpc subnet region availability zone boundary' },

  { id: 'aws_sqs', provider: 'aws', category: 'Integration & AI', label: 'Amazon SQS', subtitle: 'Message Queue', shapeType: 'service', theme: 'rose', iconKey: 'aws_sqs', iconColor: '#E7157B', keywords: 'aws sqs queue message async decouple' },
  { id: 'aws_sns', provider: 'aws', category: 'Integration & AI', label: 'Amazon SNS', subtitle: 'Pub/Sub Topic', shapeType: 'service', theme: 'rose', iconKey: 'aws_sns', iconColor: '#E7157B', keywords: 'aws sns notification pubsub topic fanout' },
  { id: 'aws_eventbridge', provider: 'aws', category: 'Integration & AI', label: 'Amazon EventBridge', subtitle: 'Event Bus', shapeType: 'service', theme: 'rose', iconKey: 'aws_eventbridge', iconColor: '#E7157B', keywords: 'aws eventbridge event bus serverless router' },
  { id: 'aws_kinesis', provider: 'aws', category: 'Integration & AI', label: 'Amazon Kinesis', subtitle: 'Data Streams', shapeType: 'service', theme: 'purple', iconKey: 'aws_kinesis', iconColor: '#8C4FFF', keywords: 'aws kinesis stream firehose analytics real-time' },
  { id: 'aws_bedrock', provider: 'aws', category: 'Integration & AI', label: 'Amazon Bedrock', subtitle: 'Generative AI', shapeType: 'service', theme: 'emerald', iconKey: 'aws_bedrock', iconColor: '#01A88D', keywords: 'aws bedrock ai llm claude foundation model rag' },
  { id: 'aws_iam', provider: 'aws', category: 'Integration & AI', label: 'AWS IAM', subtitle: 'Identity & Access', shapeType: 'service', theme: 'rose', iconKey: 'aws_iam', iconColor: '#DD344C', keywords: 'aws iam security role policy auth' },
  { id: 'aws_cloudwatch', provider: 'aws', category: 'Integration & AI', label: 'Amazon CloudWatch', subtitle: 'Observability', shapeType: 'service', theme: 'rose', iconKey: 'aws_cloudwatch', iconColor: '#E7157B', keywords: 'aws cloudwatch metrics logs alarms monitoring' },

  // ======================== GOOGLE CLOUD PLATFORM (GCP) ========================
  { id: 'gcp_run', provider: 'gcp', category: 'Compute', label: 'Cloud Run', subtitle: 'Serverless Containers', shapeType: 'service', theme: 'blue', iconKey: 'gcp_run', iconColor: '#4285F4', keywords: 'gcp google cloud run container serverless api' },
  { id: 'gcp_gce', provider: 'gcp', category: 'Compute', label: 'Compute Engine', subtitle: 'Virtual Machines', shapeType: 'service', theme: 'blue', iconKey: 'gcp_gce', iconColor: '#4285F4', keywords: 'gcp compute engine gce vm instance server' },
  { id: 'gcp_functions', provider: 'gcp', category: 'Compute', label: 'Cloud Functions', subtitle: 'Event Functions', shapeType: 'service', theme: 'blue', iconKey: 'gcp_functions', iconColor: '#4285F4', keywords: 'gcp cloud functions serverless faas' },
  { id: 'gcp_gke', provider: 'gcp', category: 'Compute', label: 'Google Kubernetes Engine', subtitle: 'GKE Cluster', shapeType: 'service', theme: 'blue', iconKey: 'gcp_gke', iconColor: '#4285F4', keywords: 'gcp gke kubernetes k8s container cluster' },

  { id: 'gcp_storage', provider: 'gcp', category: 'Storage & Database', label: 'Cloud Storage', subtitle: 'Object Buckets', shapeType: 'service', theme: 'emerald', iconKey: 'gcp_storage', iconColor: '#34A853', keywords: 'gcp gcs cloud storage bucket object blob' },
  { id: 'gcp_sql', provider: 'gcp', category: 'Storage & Database', label: 'Cloud SQL', subtitle: 'Managed PostgreSQL', shapeType: 'service', theme: 'blue', iconKey: 'gcp_sql', iconColor: '#4285F4', keywords: 'gcp cloud sql postgres mysql relational database' },
  { id: 'gcp_spanner', provider: 'gcp', category: 'Storage & Database', label: 'Cloud Spanner', subtitle: 'Global Distributed DB', shapeType: 'service', theme: 'blue', iconKey: 'gcp_spanner', iconColor: '#4285F4', keywords: 'gcp cloud spanner global sql relational database' },
  { id: 'gcp_firestore', provider: 'gcp', category: 'Storage & Database', label: 'Firestore', subtitle: 'Document NoSQL', shapeType: 'service', theme: 'amber', iconKey: 'gcp_firestore', iconColor: '#FBBC04', keywords: 'gcp firestore nosql document database firebase' },
  { id: 'gcp_bigquery', provider: 'gcp', category: 'Storage & Database', label: 'BigQuery', subtitle: 'Data Warehouse', shapeType: 'service', theme: 'blue', iconKey: 'gcp_bigquery', iconColor: '#4285F4', keywords: 'gcp bigquery warehouse analytics olap sql' },
  { id: 'gcp_memorystore', provider: 'gcp', category: 'Storage & Database', label: 'Memorystore', subtitle: 'Managed Redis', shapeType: 'service', theme: 'emerald', iconKey: 'gcp_memorystore', iconColor: '#34A853', keywords: 'gcp memorystore redis memcached cache' },

  { id: 'gcp_lb', provider: 'gcp', category: 'Networking & Edge', label: 'Cloud Load Balancing', subtitle: 'Global Anycast LB', shapeType: 'service', theme: 'emerald', iconKey: 'gcp_lb', iconColor: '#34A853', keywords: 'gcp cloud load balancing lb ingress traffic' },
  { id: 'gcp_cdn', provider: 'gcp', category: 'Networking & Edge', label: 'Cloud CDN', subtitle: 'Edge Cache', shapeType: 'service', theme: 'emerald', iconKey: 'aws_cloudfront', iconColor: '#34A853', keywords: 'gcp cloud cdn edge cache global' },
  { id: 'gcp_apigee', provider: 'gcp', category: 'Networking & Edge', label: 'Apigee API Gateway', subtitle: 'API Management', shapeType: 'service', theme: 'emerald', iconKey: 'aws_apigw', iconColor: '#34A853', keywords: 'gcp apigee api gateway management proxy' },
  { id: 'gcp_armor', provider: 'gcp', category: 'Networking & Edge', label: 'Cloud Armor', subtitle: 'DDoS & WAF', shapeType: 'service', theme: 'rose', iconKey: 'aws_iam', iconColor: '#EA4335', keywords: 'gcp cloud armor waf security firewall ddos' },
  { id: 'gcp_vpc', provider: 'gcp', category: 'Networking & Edge', label: 'GCP VPC Network', subtitle: 'Global VPC Boundary', shapeType: 'group', theme: 'blue', iconKey: 'gen_group', iconColor: '#4285F4', keywords: 'gcp vpc network subnet boundary region' },

  { id: 'gcp_pubsub', provider: 'gcp', category: 'Messaging & AI', label: 'Cloud Pub/Sub', subtitle: 'Event Messaging', shapeType: 'service', theme: 'amber', iconKey: 'gcp_pubsub', iconColor: '#F29900', keywords: 'gcp pubsub pub/sub queue stream messaging bus' },
  { id: 'gcp_dataflow', provider: 'gcp', category: 'Messaging & AI', label: 'Cloud Dataflow', subtitle: 'Stream / Batch ETL', shapeType: 'service', theme: 'emerald', iconKey: 'gcp_dataflow', iconColor: '#34A853', keywords: 'gcp dataflow apache beam stream etl pipeline' },
  { id: 'gcp_vertex', provider: 'gcp', category: 'Messaging & AI', label: 'Vertex AI', subtitle: 'Gemini & ML Platform', shapeType: 'service', theme: 'purple', iconKey: 'gcp_vertex', iconColor: '#9334E6', keywords: 'gcp vertex ai gemini llm ml machine learning' },

  // ======================== MICROSOFT AZURE ========================
  { id: 'az_vm', provider: 'azure', category: 'Compute', label: 'Azure Virtual Machines', subtitle: 'Compute VM', shapeType: 'service', theme: 'blue', iconKey: 'az_vm', iconColor: '#0078D4', keywords: 'azure vm virtual machine compute server' },
  { id: 'az_app_service', provider: 'azure', category: 'Compute', label: 'Azure App Service', subtitle: 'Managed Web Apps', shapeType: 'service', theme: 'blue', iconKey: 'az_app_service', iconColor: '#0078D4', keywords: 'azure app service web api paas hosting' },
  { id: 'az_functions', provider: 'azure', category: 'Compute', label: 'Azure Functions', subtitle: 'Serverless Compute', shapeType: 'service', theme: 'amber', iconKey: 'az_functions', iconColor: '#0078D4', keywords: 'azure functions serverless faas event' },
  { id: 'az_aks', provider: 'azure', category: 'Compute', label: 'Azure Kubernetes Service', subtitle: 'AKS Cluster', shapeType: 'service', theme: 'blue', iconKey: 'az_aks', iconColor: '#0078D4', keywords: 'azure aks kubernetes k8s container cluster' },
  { id: 'az_container_apps', provider: 'azure', category: 'Compute', label: 'Azure Container Apps', subtitle: 'Serverless Containers', shapeType: 'service', theme: 'blue', iconKey: 'az_container_apps', iconColor: '#0078D4', keywords: 'azure container apps microservices dapr keda' },

  { id: 'az_blob', provider: 'azure', category: 'Storage & Database', label: 'Azure Blob Storage', subtitle: 'Object Storage', shapeType: 'service', theme: 'emerald', iconKey: 'az_blob', iconColor: '#008272', keywords: 'azure blob storage container object file' },
  { id: 'az_sql', provider: 'azure', category: 'Storage & Database', label: 'Azure SQL Database', subtitle: 'Managed SQL', shapeType: 'service', theme: 'blue', iconKey: 'gcp_sql', iconColor: '#0078D4', keywords: 'azure sql database relational db mssql' },
  { id: 'az_cosmos', provider: 'azure', category: 'Storage & Database', label: 'Azure Cosmos DB', subtitle: 'Global NoSQL DB', shapeType: 'service', theme: 'purple', iconKey: 'az_cosmos', iconColor: '#5C2D91', keywords: 'azure cosmos db cosmosdb nosql global database' },
  { id: 'az_redis', provider: 'azure', category: 'Storage & Database', label: 'Azure Cache for Redis', subtitle: 'In-Memory Store', shapeType: 'service', theme: 'rose', iconKey: 'aws_elasticache', iconColor: '#D83B01', keywords: 'azure cache redis memory store' },

  { id: 'az_front_door', provider: 'azure', category: 'Networking & AI', label: 'Azure Front Door', subtitle: 'Global CDN & WAF', shapeType: 'service', theme: 'blue', iconKey: 'aws_cloudfront', iconColor: '#0078D4', keywords: 'azure front door cdn waf edge routing' },
  { id: 'az_app_gw', provider: 'azure', category: 'Networking & AI', label: 'Application Gateway', subtitle: 'L7 Load Balancer', shapeType: 'service', theme: 'emerald', iconKey: 'gcp_lb', iconColor: '#008272', keywords: 'azure application gateway load balancer l7 waf' },
  { id: 'az_apim', provider: 'azure', category: 'Networking & AI', label: 'Azure API Management', subtitle: 'API Gateway', shapeType: 'service', theme: 'purple', iconKey: 'aws_apigw', iconColor: '#5C2D91', keywords: 'azure apim api management gateway proxy' },
  { id: 'az_service_bus', provider: 'azure', category: 'Networking & AI', label: 'Azure Service Bus', subtitle: 'Enterprise Messaging', shapeType: 'service', theme: 'amber', iconKey: 'az_service_bus', iconColor: '#0078D4', keywords: 'azure service bus queue topic enterprise messaging' },
  { id: 'az_event_hubs', provider: 'azure', category: 'Networking & AI', label: 'Azure Event Hubs', subtitle: 'Event Streaming', shapeType: 'service', theme: 'amber', iconKey: 'aws_kinesis', iconColor: '#0078D4', keywords: 'azure event hubs kafka streaming ingestion' },
  { id: 'az_openai', provider: 'azure', category: 'Networking & AI', label: 'Azure OpenAI Service', subtitle: 'GPT & Embeddings', shapeType: 'service', theme: 'purple', iconKey: 'az_openai', iconColor: '#5C2D91', keywords: 'azure openai gpt llm ai embeddings' },
  { id: 'az_vnet', provider: 'azure', category: 'Networking & AI', label: 'Azure Virtual Network', subtitle: 'VNet Boundary', shapeType: 'group', theme: 'blue', iconKey: 'gen_group', iconColor: '#0078D4', keywords: 'azure vnet virtual network subnet boundary' },

  // ======================== KUBERNETES (K8S) ========================
  { id: 'k8s_pod', provider: 'k8s', category: 'Workloads', label: 'Pod', subtitle: 'K8s Workload', shapeType: 'service', theme: 'blue', iconKey: 'k8s_pod', iconColor: '#326CE5', keywords: 'k8s kubernetes pod container workload' },
  { id: 'k8s_deploy', provider: 'k8s', category: 'Workloads', label: 'Deployment', subtitle: 'Replica Controller', shapeType: 'service', theme: 'blue', iconKey: 'k8s_deploy', iconColor: '#326CE5', keywords: 'k8s kubernetes deployment replicaset stateless' },
  { id: 'k8s_sts', provider: 'k8s', category: 'Workloads', label: 'StatefulSet', subtitle: 'Stateful Pods', shapeType: 'service', theme: 'blue', iconKey: 'k8s_sts', iconColor: '#326CE5', keywords: 'k8s kubernetes statefulset database ordered' },
  { id: 'k8s_job', provider: 'k8s', category: 'Workloads', label: 'Job / CronJob', subtitle: 'Batch Runner', shapeType: 'service', theme: 'blue', iconKey: 'gcp_gce', iconColor: '#326CE5', keywords: 'k8s kubernetes job cronjob batch scheduled' },

  { id: 'k8s_svc', provider: 'k8s', category: 'Network, Config & Storage', label: 'Service (ClusterIP/LB)', subtitle: 'Service Discovery', shapeType: 'service', theme: 'emerald', iconKey: 'k8s_svc', iconColor: '#326CE5', keywords: 'k8s kubernetes service clusterip nodeport loadbalancer' },
  { id: 'k8s_ing', provider: 'k8s', category: 'Network, Config & Storage', label: 'Ingress Controller', subtitle: 'HTTP/S Routing', shapeType: 'service', theme: 'emerald', iconKey: 'k8s_ing', iconColor: '#326CE5', keywords: 'k8s kubernetes ingress nginx traefik gateway route' },
  { id: 'k8s_cm', provider: 'k8s', category: 'Network, Config & Storage', label: 'ConfigMap', subtitle: 'App Configuration', shapeType: 'service', theme: 'slate', iconKey: 'k8s_cm', iconColor: '#326CE5', keywords: 'k8s kubernetes configmap env config' },
  { id: 'k8s_secret', provider: 'k8s', category: 'Network, Config & Storage', label: 'Secret', subtitle: 'Encrypted Credentials', shapeType: 'service', theme: 'rose', iconKey: 'k8s_secret', iconColor: '#326CE5', keywords: 'k8s kubernetes secret tls credentials key' },
  { id: 'k8s_pv', provider: 'k8s', category: 'Network, Config & Storage', label: 'PersistentVolume (PVC)', subtitle: 'Cluster Storage', shapeType: 'service', theme: 'blue', iconKey: 'k8s_pv', iconColor: '#326CE5', keywords: 'k8s kubernetes pv pvc persistent volume storage disk' },
  { id: 'k8s_cluster', provider: 'k8s', category: 'Network, Config & Storage', label: 'K8s Cluster / Namespace', subtitle: 'Cluster Boundary', shapeType: 'group', theme: 'blue', iconKey: 'k8s_cluster', iconColor: '#326CE5', keywords: 'k8s kubernetes cluster namespace boundary group' }
];

/**
 * Helper to return an inline `<svg>` string for sidebar catalog buttons
 */
export function getCatalogIconSvg(iconKey, shapeType = 'service') {
  const key = iconKey || (
    shapeType === 'database' ? 'gen_database' :
    shapeType === 'queue' ? 'gen_queue' :
    shapeType === 'client' ? 'gen_client' :
    shapeType === 'gateway' ? 'gen_gateway' :
    shapeType === 'group' ? 'gen_group' : 'gen_service'
  );
  const paths = ICON_SVG_PATHS[key] || ICON_SVG_PATHS.gen_service;
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" class="block">${paths}</svg>`;
}

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function ensureMarkerDefs(svgRoot) {
  if (!svgRoot) return;
  let defs = svgRoot.querySelector('defs');
  if (!defs) {
    defs = svgCreate('defs');
    svgAppend(svgRoot, defs);
  }
  if (!defs.querySelector('#cq-arrow-end')) {
    const marker = svgCreate('marker');
    svgAttr(marker, {
      id: 'cq-arrow-end',
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '6.5',
      markerHeight: '6.5',
      orient: 'auto-start-reverse'
    });
    const path = svgCreate('path');
    svgAttr(path, {
      d: 'M 0 1.5 L 8.5 5 L 0 8.5 z',
      fill: '#475569'
    });
    svgAppend(marker, path);
    svgAppend(defs, marker);
  }
}

function wrapLines(text, maxCharsPerLine = 20, maxLines = 3) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    if ((current + ' ' + words[i]).length <= maxCharsPerLine) {
      current += ' ' + words[i];
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

/**
 * Custom Renderer for CloudQubes Architecture Shapes, Official Cloud Provider Nodes & Orthogonal Connections
 */
class CloudQubesRenderer extends BaseRenderer {
  constructor(eventBus, canvas) {
    super(eventBus, 1500);
    this._canvas = canvas;
  }

  canRender(element) {
    return !element.labelTarget;
  }

  drawShape(parentGfx, element) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector('svg'));

    const w = element.width || 184;
    const h = element.height || 76;
    const shapeType = element.shapeType || 'service';
    const theme = THEMES[element.theme] || THEMES.slate;
    const label = element.nodeTitle !== undefined ? element.nodeTitle : 'Service';
    const subtitle = element.subtitle !== undefined ? element.subtitle : '';
    const provider = element.provider || '';
    const iconKey = element.iconKey || '';
    const iconColor = element.iconColor || theme.stroke;

    if (shapeType === 'group') {
      const borderColor = (provider && provider !== 'general' && iconColor) ? iconColor : theme.stroke;
      const rect = svgCreate('rect');
      svgAttr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: 14,
        ry: 14,
        fill: 'rgba(248, 250, 252, 0.55)',
        stroke: borderColor,
        'stroke-width': 1.75,
        'stroke-dasharray': '7 5'
      });
      svgAppend(parentGfx, rect);

      const hasProviderBadge = provider && provider !== 'general' && PROVIDER_META[provider];
      const provTag = hasProviderBadge ? PROVIDER_META[provider].label : '';
      const badgeW = Math.min(w - 20, Math.max(110, label.length * 7.2 + (provTag ? 62 : 26)));

      const badgeRect = svgCreate('rect');
      svgAttr(badgeRect, {
        x: 12,
        y: 10,
        width: badgeW,
        height: 26,
        rx: 7,
        ry: 7,
        fill: '#ffffff',
        stroke: borderColor,
        'stroke-width': 1.25
      });
      svgAppend(parentGfx, badgeRect);

      let textX = 22;
      if (hasProviderBadge) {
        const pill = svgCreate('rect');
        svgAttr(pill, {
          x: 16,
          y: 14,
          width: 38,
          height: 18,
          rx: 4,
          ry: 4,
          fill: borderColor
        });
        svgAppend(parentGfx, pill);

        const pillText = svgCreate('text');
        svgAttr(pillText, {
          x: 35,
          y: 26,
          'text-anchor': 'middle',
          fill: '#ffffff',
          'font-family': FONT_STACK,
          'font-size': '9px',
          'font-weight': '800',
          'letter-spacing': '0.04em'
        });
        pillText.textContent = provTag;
        svgAppend(parentGfx, pillText);
        textX = 62;
      }

      const titleEl = svgCreate('text');
      svgAttr(titleEl, {
        x: textX,
        y: 27,
        fill: theme.titleText,
        'font-family': FONT_STACK,
        'font-size': '11.5px',
        'font-weight': '700'
      });
      titleEl.textContent = label;
      svgAppend(parentGfx, titleEl);

      return rect;
    }

    // Cloud Service / K8s Icon Card Node (AWS, GCP, Azure, K8s)
    if (iconKey && ICON_SVG_PATHS[iconKey]) {
      return this._drawCloudIconCard(parentGfx, {
        w,
        h,
        label,
        subtitle,
        provider,
        iconKey,
        iconColor,
        theme
      });
    }

    if (shapeType === 'database') {
      const ry = 11;
      const bodyPath = svgCreate('path');
      const d = [
        `M 0 ${ry}`,
        `L 0 ${h - ry}`,
        `A ${w / 2} ${ry} 0 0 0 ${w} ${h - ry}`,
        `L ${w} ${ry}`,
        `A ${w / 2} ${ry} 0 0 0 0 ${ry}`,
        'Z'
      ].join(' ');
      svgAttr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, bodyPath);

      const topEllipse = svgCreate('ellipse');
      svgAttr(topEllipse, {
        cx: w / 2,
        cy: ry,
        rx: w / 2,
        ry: ry,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, topEllipse);

      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 8);
      return bodyPath;
    }

    if (shapeType === 'queue') {
      const rx = 12;
      const bodyPath = svgCreate('path');
      const d = [
        `M ${rx} 0`,
        `L ${w - rx} 0`,
        `A ${rx} ${h / 2} 0 0 1 ${w - rx} ${h}`,
        `L ${rx} ${h}`,
        `A ${rx} ${h / 2} 0 0 1 ${rx} 0`,
        'Z'
      ].join(' ');
      svgAttr(bodyPath, {
        d,
        fill: theme.fill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, bodyPath);

      const rightCap = svgCreate('ellipse');
      svgAttr(rightCap, {
        cx: w - rx,
        cy: h / 2,
        rx: rx,
        ry: h / 2,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 1.75
      });
      svgAppend(parentGfx, rightCap);

      this._renderTextBlock(parentGfx, w - 10, h, label, subtitle, theme, 0);
      return bodyPath;
    }

    if (shapeType === 'client') {
      const r = Math.min(34, h / 2);
      const rect = svgCreate('rect');
      svgAttr(rect, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        rx: r,
        ry: r,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2
      });
      svgAppend(parentGfx, rect);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0);
      return rect;
    }

    if (shapeType === 'gateway') {
      const polygon = svgCreate('polygon');
      const pts = [
        `${w / 2},0`,
        `${w},${h / 2}`,
        `${w / 2},${h}`,
        `0,${h / 2}`
      ].join(' ');
      svgAttr(polygon, {
        points: pts,
        fill: theme.headerFill,
        stroke: theme.stroke,
        'stroke-width': 2,
        'stroke-linejoin': 'round'
      });
      svgAppend(parentGfx, polygon);
      this._renderTextBlock(parentGfx, w, h, label, subtitle, theme, 0, 14);
      return polygon;
    }

    // Default: 'service' card with subtle top accent strip
    const card = svgCreate('rect');
    svgAttr(card, {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 12,
      ry: 12,
      fill: theme.fill,
      stroke: theme.stroke,
      'stroke-width': 2
    });
    svgAppend(parentGfx, card);

    const accentStrip = svgCreate('path');
    const r = 11;
    const stripH = 22;
    const stripPath = [
      `M 1 ${stripH}`,
      `L 1 ${r}`,
      `Q 1 1 ${r} 1`,
      `L ${w - r} 1`,
      `Q ${w - 1} 1 ${w - 1} ${r}`,
      `L ${w - 1} ${stripH}`,
      'Z'
    ].join(' ');
    svgAttr(accentStrip, {
      d: stripPath,
      fill: theme.headerFill
    });
    svgAppend(parentGfx, accentStrip);

    const divider = svgCreate('line');
    svgAttr(divider, {
      x1: 1,
      y1: stripH,
      x2: w - 1,
      y2: stripH,
      stroke: theme.stroke,
      'stroke-width': 1,
      'stroke-opacity': 0.25
    });
    svgAppend(parentGfx, divider);

    if (subtitle) {
      const subText = svgCreate('text');
      svgAttr(subText, {
        x: w / 2,
        y: 15,
        'text-anchor': 'middle',
        fill: theme.badgeText,
        'font-family': FONT_STACK,
        'font-size': '9.5px',
        'font-weight': '700',
        'letter-spacing': '0.06em'
      });
      subText.textContent = String(subtitle).toUpperCase();
      svgAppend(parentGfx, subText);
    }

    this._renderMainLabel(parentGfx, w, h, label, theme, subtitle ? 11 : 0, 20);
    return card;
  }

  _drawCloudIconCard(parentGfx, { w, h, label, subtitle, provider, iconKey, iconColor, theme }) {
    const borderStroke = iconColor || theme.stroke;

    // Main Card Container
    const card = svgCreate('rect');
    svgAttr(card, {
      x: 0,
      y: 0,
      width: w,
      height: h,
      rx: 12,
      ry: 12,
      fill: '#ffffff',
      stroke: '#cbd5e1',
      'stroke-width': 1.75
    });
    svgAppend(parentGfx, card);

    // Left vertical brand accent strip inside card
    const leftStrip = svgCreate('path');
    svgAttr(leftStrip, {
      d: `M 5 1.5 L 1.5 1.5 Q 1.5 1.5 1.5 12 L 1.5 ${h - 12} Q 1.5 ${h - 1.5} 5 ${h - 1.5} Z`,
      fill: borderStroke
    });
    svgAppend(parentGfx, leftStrip);

    // 44x44 Rounded Service Icon Tile
    const tileSize = 44;
    const tileX = 13;
    const tileY = Math.round((h - tileSize) / 2);

    const iconTile = svgCreate('rect');
    svgAttr(iconTile, {
      x: tileX,
      y: tileY,
      width: tileSize,
      height: tileSize,
      rx: 10,
      ry: 10,
      fill: borderStroke
    });
    svgAppend(parentGfx, iconTile);

    // Vector Service Artwork centered in tile
    const iconSvg = svgCreate('svg');
    svgAttr(iconSvg, {
      x: tileX + 9,
      y: tileY + 9,
      width: 26,
      height: 26,
      viewBox: '0 0 24 24',
      style: 'color: #ffffff;'
    });
    iconSvg.innerHTML = ICON_SVG_PATHS[iconKey] || ICON_SVG_PATHS.gen_service;
    svgAppend(parentGfx, iconSvg);

    // Right-hand Metadata + Label column
    const textX = tileX + tileSize + 11;
    const provInfo = PROVIDER_META[provider];

    if (provInfo && provider !== 'general') {
      const pillW = provInfo.label.length * 5.8 + 10;
      const pillRect = svgCreate('rect');
      svgAttr(pillRect, {
        x: textX,
        y: 13,
        width: pillW,
        height: 15,
        rx: 4,
        ry: 4,
        fill: provInfo.bg,
        stroke: provInfo.border,
        'stroke-width': 1
      });
      svgAppend(parentGfx, pillRect);

      const pillText = svgCreate('text');
      svgAttr(pillText, {
        x: textX + pillW / 2,
        y: 23.5,
        'text-anchor': 'middle',
        fill: provInfo.text,
        'font-family': FONT_STACK,
        'font-size': '8.5px',
        'font-weight': '800',
        'letter-spacing': '0.04em'
      });
      pillText.textContent = provInfo.label;
      svgAppend(parentGfx, pillText);

      if (subtitle) {
        const subEl = svgCreate('text');
        svgAttr(subEl, {
          x: textX + pillW + 6,
          y: 23.5,
          fill: '#64748b',
          'font-family': FONT_STACK,
          'font-size': '9px',
          'font-weight': '600'
        });
        subEl.textContent = String(subtitle).slice(0, 18);
        svgAppend(parentGfx, subEl);
      }
    } else if (subtitle) {
      const subEl = svgCreate('text');
      svgAttr(subEl, {
        x: textX,
        y: 23,
        fill: theme.badgeText,
        'font-family': FONT_STACK,
        'font-size': '9px',
        'font-weight': '700',
        'letter-spacing': '0.05em'
      });
      subEl.textContent = String(subtitle).toUpperCase();
      svgAppend(parentGfx, subEl);
    }

    // Primary Label (left-aligned, up to 2 lines)
    const maxChars = Math.max(12, Math.floor((w - textX - 10) / 6.7));
    const lines = wrapLines(label, maxChars, 2);
    const baseY = lines.length === 1 ? 48 : 42;

    lines.forEach((lineStr, idx) => {
      const t = svgCreate('text');
      svgAttr(t, {
        x: textX,
        y: baseY + idx * 14.5,
        fill: '#0f172a',
        'font-family': FONT_STACK,
        'font-size': '12px',
        'font-weight': '700'
      });
      t.textContent = lineStr;
      svgAppend(parentGfx, t);
    });

    return card;
  }

  _renderTextBlock(parentGfx, w, h, label, subtitle, theme, yOffset = 0, maxChars = 19) {
    if (subtitle) {
      const subText = svgCreate('text');
      svgAttr(subText, {
        x: w / 2,
        y: h / 2 - 8 + yOffset,
        'text-anchor': 'middle',
        fill: theme.badgeText,
        'font-family': FONT_STACK,
        'font-size': '9.5px',
        'font-weight': '700',
        'letter-spacing': '0.05em'
      });
      subText.textContent = String(subtitle).toUpperCase();
      svgAppend(parentGfx, subText);
    }

    this._renderMainLabel(parentGfx, w, h, label, theme, yOffset + (subtitle ? 8 : 0), maxChars);
  }

  _renderMainLabel(parentGfx, w, h, label, theme, yShift = 0, maxChars = 20) {
    const lines = wrapLines(label, maxChars, 3);
    const lineHeight = 15;
    const totalH = (lines.length - 1) * lineHeight;
    const startY = h / 2 + yShift - totalH / 2 + 4;

    lines.forEach((lineStr, idx) => {
      const t = svgCreate('text');
      svgAttr(t, {
        x: w / 2,
        y: startY + idx * lineHeight,
        'text-anchor': 'middle',
        fill: theme.titleText,
        'font-family': FONT_STACK,
        'font-size': '12.5px',
        'font-weight': '700'
      });
      t.textContent = lineStr;
      svgAppend(parentGfx, t);
    });
  }

  drawConnection(parentGfx, connection) {
    ensureMarkerDefs(this._canvas.getContainer().querySelector('svg'));

    const waypoints = connection.waypoints || [];
    if (waypoints.length < 2) return svgCreate('g');

    // Rounded orthogonal path
    const d = this._buildRoundedPath(waypoints, 8);
    const path = svgCreate('path');
    svgAttr(path, {
      d,
      fill: 'none',
      stroke: '#475569',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'marker-end': 'url(#cq-arrow-end)'
    });
    svgAppend(parentGfx, path);

    // Optional label pill at connection midpoint
    if (connection.nodeTitle && String(connection.nodeTitle).trim().length > 0) {
      const mid = this._getConnectionMidpoint(waypoints);
      const labelText = String(connection.nodeTitle).trim();
      const pillW = Math.max(40, labelText.length * 6.5 + 16);
      const pillH = 20;

      const bg = svgCreate('rect');
      svgAttr(bg, {
        x: mid.x - pillW / 2,
        y: mid.y - pillH / 2,
        width: pillW,
        height: pillH,
        rx: 6,
        ry: 6,
        fill: '#ffffff',
        stroke: '#cbd5e1',
        'stroke-width': 1.25
      });
      svgAppend(parentGfx, bg);

      const textEl = svgCreate('text');
      svgAttr(textEl, {
        x: mid.x,
        y: mid.y + 3.5,
        'text-anchor': 'middle',
        fill: '#334155',
        'font-family': FONT_STACK,
        'font-size': '10.5px',
        'font-weight': '600'
      });
      textEl.textContent = labelText;
      svgAppend(parentGfx, textEl);
    }

    return path;
  }

  _buildRoundedPath(pts, radius = 8) {
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const len1 = Math.hypot(dx1, dy1);

      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      const len2 = Math.hypot(dx2, dy2);

      const r = Math.min(radius, len1 / 2, len2 / 2);
      if (r < 1) {
        d += ` L ${curr.x} ${curr.y}`;
      } else {
        const p1x = curr.x - (dx1 / len1) * r;
        const p1y = curr.y - (dy1 / len1) * r;
        const p2x = curr.x + (dx2 / len2) * r;
        const p2y = curr.y + (dy2 / len2) * r;
        d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`;
      }
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  _getConnectionMidpoint(pts) {
    const midIdx = Math.floor((pts.length - 1) / 2);
    const a = pts[midIdx];
    const b = pts[midIdx + 1] || a;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }

  getShapePath(shape) {
    const x = shape.x || 0;
    const y = shape.y || 0;
    const width = shape.width || 184;
    const height = shape.height || 76;

    return componentsToPath([
      ['M', x, y],
      ['l', width, 0],
      ['l', 0, height],
      ['l', -width, 0],
      ['z']
    ]);
  }

  getConnectionPath(connection) {
    const waypoints = connection.waypoints || [];
    const connectionPath = [];

    for (let idx = 0; idx < waypoints.length; idx++) {
      let point = waypoints[idx];
      point = point.original || point;
      connectionPath.push([idx === 0 ? 'M' : 'L', point.x, point.y]);
    }

    return componentsToPath(connectionPath);
  }
}
CloudQubesRenderer.$inject = ['eventBus', 'canvas'];

/**
 * Orthogonal Manhattan Connection Layouter
 */
class CloudQubesLayouter extends BaseLayouter {
  layoutConnection(connection, hints = {}) {
    const source = hints.source || connection.source;
    const target = hints.target || connection.target;
    const start = hints.connectionStart || getMid(source);
    const end = hints.connectionEnd || getMid(target);

    const waypoints = repairConnection(
      source,
      target,
      start,
      end,
      connection.waypoints,
      Object.assign({ preferredLayouts: ['h:h'] }, hints)
    );

    return waypoints;
  }
}
CloudQubesLayouter.$inject = [];

/**
 * Modeling Rules for Moving, Resizing, Creating, and Connecting Nodes
 */
class CloudQubesRules extends RuleProvider {
  init() {
    this.addRule('elements.move', () => true);
    this.addRule('shape.create', () => true);
    this.addRule('shape.resize', (context) => {
      if (!context.newBounds) return true;
      return context.newBounds.width >= 90 && context.newBounds.height >= 48;
    });
    this.addRule('connection.create', (context) => {
      const { source, target } = context;
      if (!source || !target || source === target) return false;
      if (!source.parent || !target.parent) return false;
      if (source.waypoints || target.waypoints) return false;
      return true;
    });
    this.addRule('connection.reconnect', () => true);
    this.addRule('connection.updateWaypoints', () => true);
  }
}
CloudQubesRules.$inject = ['eventBus'];

/**
 * On-Canvas Context Pad Provider (Connect Arrow, Quick Append Node, Delete)
 */
class CloudQubesContextPadProvider {
  constructor(contextPad, connect, modeling, elementFactory, canvas, selection) {
    this._connect = connect;
    this._modeling = modeling;
    this._elementFactory = elementFactory;
    this._canvas = canvas;
    this._selection = selection;

    contextPad.registerProvider(this);
  }

  getContextPadEntries(element) {
    const connect = this._connect;
    const modeling = this._modeling;
    const elementFactory = this._elementFactory;
    const canvas = this._canvas;
    const selection = this._selection;

    const entries = {};

    if (!element.waypoints) {
      entries['connect'] = {
        group: 'connect',
        className: 'cq-pad-connect',
        title: 'Drag or click to connect arrow to another node',
        html: '<div class="entry" title="Connect Arrow">→</div>',
        action: {
          click: (event, el) => {
            connect.start(event, el);
          },
          dragstart: (event, el) => {
            connect.start(event, el);
          }
        }
      };

      entries['append'] = {
        group: 'edit',
        className: 'cq-pad-append',
        title: 'Append connected node to the right',
        html: '<div class="entry" title="Append Connected Node">+</div>',
        action: {
          click: (_event, el) => {
            const root = canvas.getRootElement();
            const newShape = elementFactory.createShape({
              width: el.width || 192,
              height: el.height || 76,
              shapeType: el.shapeType === 'group' ? 'service' : (el.shapeType || 'service'),
              nodeTitle: el.nodeTitle || 'New Service',
              subtitle: el.subtitle || 'Compute',
              theme: el.theme || 'slate',
              provider: el.provider || '',
              iconKey: el.iconKey || '',
              iconColor: el.iconColor || ''
            });
            const pos = {
              x: el.x + (el.width || 192) + 165,
              y: el.y + ((el.height || 76) / 2)
            };
            const created = modeling.createShape(newShape, pos, root);
            modeling.connect(el, created, { nodeTitle: '' });
            selection.select(created);
          }
        }
      };
    }

    entries['delete'] = {
      group: 'edit',
      className: 'cq-pad-delete',
      title: 'Delete element',
      html: '<div class="entry cq-pad-danger" title="Delete">×</div>',
      action: {
        click: (_event, el) => {
          modeling.removeElements([el]);
        }
      }
    };

    return entries;
  }
}
CloudQubesContextPadProvider.$inject = [
  'contextPad',
  'connect',
  'modeling',
  'elementFactory',
  'canvas',
  'selection'
];

const CloudQubesCustomModule = {
  __init__: ['cloudQubesRenderer', 'cloudQubesRules', 'cloudQubesContextPadProvider'],
  cloudQubesRenderer: ['type', CloudQubesRenderer],
  cloudQubesRules: ['type', CloudQubesRules],
  cloudQubesContextPadProvider: ['type', CloudQubesContextPadProvider],
  layouter: ['type', CloudQubesLayouter]
};

/**
 * High-level controller wrapping diagram-js for Zenmark Studio
 */
export class CloudQubesDiagramStudio {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.diagram = new Diagram({
      canvas: { container },
      modules: [
        ModelingModule,
        MoveModule,
        SelectionModule,
        ConnectModule,
        CreateModule,
        BendpointsModule,
        ResizeModule,
        SnappingModule,
        GridSnappingModule,
        KeyboardModule,
        KeyboardMoveSelectionModule,
        OutlineModule,
        ContextPadModule,
        RulesModule,
        ZoomScrollModule,
        MoveCanvasModule,
        CloudQubesCustomModule
      ]
    });

    this.canvas = this.diagram.get('canvas');
    this.modeling = this.diagram.get('modeling');
    this.elementFactory = this.diagram.get('elementFactory');
    this.elementRegistry = this.diagram.get('elementRegistry');
    this.selection = this.diagram.get('selection');
    this.commandStack = this.diagram.get('commandStack');
    this.eventBus = this.diagram.get('eventBus');

    this.root = this.elementFactory.createRoot({ id: 'cq-root' });
    this.canvas.setRootElement(this.root);

    this.pendingConnectSource = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('selection.changed', (e) => {
      const selected = e.newSelection && e.newSelection[0] ? e.newSelection[0] : null;
      if (this.callbacks.onSelectionChange) {
        this.callbacks.onSelectionChange(selected);
      }
    });

    this.eventBus.on('element.click', (e) => {
      const el = e.element;
      if (!el || el === this.root || el.waypoints) return;

      if (this.pendingConnectSource !== undefined && this.pendingConnectSource !== false) {
        if (this.pendingConnectSource === null) {
          this.pendingConnectSource = el;
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep('target', el);
          }
        } else if (this.pendingConnectSource !== el) {
          const src = this.pendingConnectSource;
          this.pendingConnectSource = false;
          const conn = this.modeling.connect(src, el, { nodeTitle: '' });
          this.selection.select(conn);
          if (this.callbacks.onConnectStep) {
            this.callbacks.onConnectStep('done', conn);
          }
        }
      }
    });

    this.eventBus.on('element.dblclick', (e) => {
      const el = e.element;
      if (!el || el === this.root) return;
      if (this.callbacks.onElementDoubleClick) {
        this.callbacks.onElementDoubleClick(el);
      }
    });
  }

  startTwoClickConnect() {
    this.pendingConnectSource = null;
  }

  cancelTwoClickConnect() {
    this.pendingConnectSource = false;
  }

  /**
   * Converts browser client (clientX, clientY) coordinates into diagram-js canvas coordinates.
   */
  clientToCanvasCoords(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const viewbox = this.canvas.viewbox();
    const scale = viewbox.scale || 1;
    return {
      x: Math.round(viewbox.x + (clientX - rect.left) / scale),
      y: Math.round(viewbox.y + (clientY - rect.top) / scale)
    };
  }

  addNode({
    shapeType = 'service',
    label = 'Service',
    subtitle = 'Compute',
    theme = 'slate',
    provider = '',
    iconKey = '',
    iconColor = '',
    x,
    y,
    width,
    height
  }) {
    const isGroup = shapeType === 'group';
    const isGateway = shapeType === 'gateway' && !iconKey;
    const w = width || (isGroup ? 480 : isGateway ? 156 : iconKey ? 196 : 172);
    const h = height || (isGroup ? 260 : isGateway ? 86 : 76);

    const existingShapes = this.elementRegistry.filter(el => el !== this.root && !el.waypoints);
    const posX = x !== undefined ? x : 140 + (existingShapes.length % 3) * 240;
    const posY = y !== undefined ? y : 130 + Math.floor(existingShapes.length / 3) * 130;

    const shape = this.elementFactory.createShape({
      width: w,
      height: h,
      shapeType,
      nodeTitle: label,
      subtitle,
      theme,
      provider,
      iconKey,
      iconColor
    });

    const created = this.modeling.createShape(shape, { x: posX + w / 2, y: posY + h / 2 }, this.root);
    if (isGroup) {
      // Send group behind normal shapes in SVG DOM order
      const gfx = this.canvas.getGraphics(created);
      if (gfx && gfx.parentNode) {
        gfx.parentNode.insertBefore(gfx, gfx.parentNode.firstChild);
      }
    }
    this.selection.select(created);
    return created;
  }

  connectNodes(source, target, options = '') {
    const label = typeof options === 'string' ? options : (options?.label || '');
    const theme = typeof options === 'object' ? (options?.theme || 'slate') : 'slate';
    const conn = this.modeling.connect(source, target, { nodeTitle: label, theme });
    if (typeof options === 'object' && Array.isArray(options.waypoints) && options.waypoints.length >= 2) {
      try {
        this.modeling.updateWaypoints(conn, options.waypoints);
      } catch (err) {
        // Fall back to default orthogonal routing
      }
    }
    return conn;
  }

  connect(source, target, options = '') {
    return this.connectNodes(source, target, options);
  }

  updateElement(element, props = {}) {
    if (!element || element === this.root) return;
    if (props.label !== undefined) {
      element.nodeTitle = props.label;
    }
    if (props.subtitle !== undefined) {
      element.subtitle = props.subtitle;
    }
    if (props.theme !== undefined) {
      element.theme = props.theme;
      if (THEMES[props.theme] && element.iconKey) {
        element.iconColor = THEMES[props.theme].stroke;
      }
    }
    if (props.iconColor !== undefined) {
      element.iconColor = props.iconColor;
    }
    if (props.iconKey !== undefined) {
      element.iconKey = props.iconKey;
    }
    if (props.provider !== undefined) {
      element.provider = props.provider;
    }
    const gfx = this.canvas.getGraphics(element);
    if (gfx) {
      const visual = gfx.querySelector('.djs-visual');
      if (visual) {
        while (visual.firstChild) visual.removeChild(visual.firstChild);
        const renderer = this.diagram.get('cloudQubesRenderer');
        if (element.waypoints) {
          renderer.drawConnection(visual, element);
        } else {
          renderer.drawShape(visual, element);
        }
      }
    }
  }

  duplicateElement(element) {
    if (!element || element === this.root || element.waypoints) return null;
    return this.addNode({
      shapeType: element.shapeType,
      label: element.nodeTitle,
      subtitle: element.subtitle,
      theme: element.theme,
      provider: element.provider,
      iconKey: element.iconKey,
      iconColor: element.iconColor,
      width: element.width,
      height: element.height,
      x: element.x + 36,
      y: element.y + 36
    });
  }

  deleteElement(element) {
    if (!element || element === this.root) return;
    this.modeling.removeElements([element]);
  }

  clear() {
    const all = this.elementRegistry.filter(el => el !== this.root);
    if (all.length > 0) {
      this.modeling.removeElements(all);
    }
    this.commandStack.clear();
  }

  undo() {
    if (this.commandStack.canUndo()) this.commandStack.undo();
  }

  redo() {
    if (this.commandStack.canRedo()) this.commandStack.redo();
  }

  zoomIn() {
    const current = this.canvas.zoom();
    this.canvas.zoom(Math.min(2.5, current * 1.2));
  }

  zoomOut() {
    const current = this.canvas.zoom();
    this.canvas.zoom(Math.max(0.3, current / 1.2));
  }

  zoomFit() {
    this.canvas.zoom('fit-viewport', 'auto');
  }

  loadTemplate(templateName) {
    this.clear();

    if (templateName === 'blank') {
      return;
    }

    if (templateName === 'aws_serverless') {
      this.addNode({ shapeType: 'group', provider: 'aws', iconColor: '#8C4FFF', label: 'AWS Cloud VPC (us-east-1)', subtitle: 'Boundary', theme: 'purple', x: 265, y: 45, width: 760, height: 325 });
      const r53 = this.addNode({ provider: 'aws', iconKey: 'aws_route53', iconColor: '#8C4FFF', label: 'Amazon Route 53', subtitle: 'Managed DNS', theme: 'purple', x: 35, y: 170 });
      const apigw = this.addNode({ provider: 'aws', iconKey: 'aws_apigw', iconColor: '#8C4FFF', label: 'Amazon API Gateway', subtitle: 'REST / HTTP API', theme: 'purple', x: 290, y: 170 });
      const fn = this.addNode({ provider: 'aws', iconKey: 'aws_lambda', iconColor: '#ED7100', label: 'Order Handler', subtitle: 'AWS Lambda', theme: 'amber', x: 545, y: 100 });
      const sqs = this.addNode({ provider: 'aws', iconKey: 'aws_sqs', iconColor: '#E7157B', label: 'Amazon SQS', subtitle: 'Order Queue', theme: 'rose', x: 545, y: 245 });
      const dynamo = this.addNode({ provider: 'aws', iconKey: 'aws_dynamodb', iconColor: '#3B48CC', label: 'Amazon DynamoDB', subtitle: 'Orders Table', theme: 'blue', x: 800, y: 100 });
      const s3 = this.addNode({ provider: 'aws', iconKey: 'aws_s3', iconColor: '#3F8624', label: 'Amazon S3', subtitle: 'Invoice Archive', theme: 'emerald', x: 800, y: 245 });

      this.connectNodes(r53, apigw, 'HTTPS');
      this.connectNodes(apigw, fn, 'Invoke');
      this.connectNodes(fn, dynamo, 'PutItem');
      this.connectNodes(fn, sqs, 'Enqueue');
      this.connectNodes(sqs, s3, 'Archive');
      this.selection.select([]);
      return;
    }

    if (templateName === 'azure_microservices') {
      this.addNode({ shapeType: 'group', provider: 'azure', iconColor: '#0078D4', label: 'Azure Virtual Network (eastus2)', subtitle: 'Boundary', theme: 'blue', x: 265, y: 45, width: 760, height: 325 });
      const fd = this.addNode({ provider: 'azure', iconKey: 'aws_cloudfront', iconColor: '#0078D4', label: 'Azure Front Door', subtitle: 'Global CDN & WAF', theme: 'blue', x: 35, y: 170 });
      const apim = this.addNode({ provider: 'azure', iconKey: 'aws_apigw', iconColor: '#5C2D91', label: 'API Management', subtitle: 'API Gateway', theme: 'purple', x: 290, y: 170 });
      const aca = this.addNode({ provider: 'azure', iconKey: 'az_container_apps', iconColor: '#0078D4', label: 'Container Apps', subtitle: 'Microservices', theme: 'blue', x: 545, y: 100 });
      const bus = this.addNode({ provider: 'azure', iconKey: 'az_service_bus', iconColor: '#0078D4', label: 'Azure Service Bus', subtitle: 'Event Topics', theme: 'amber', x: 545, y: 245 });
      const cosmos = this.addNode({ provider: 'azure', iconKey: 'az_cosmos', iconColor: '#5C2D91', label: 'Azure Cosmos DB', subtitle: 'Global NoSQL', theme: 'purple', x: 800, y: 100 });
      const openai = this.addNode({ provider: 'azure', iconKey: 'az_openai', iconColor: '#5C2D91', label: 'Azure OpenAI', subtitle: 'GPT-4o & RAG', theme: 'purple', x: 800, y: 245 });

      this.connectNodes(fd, apim, 'TLS 1.3');
      this.connectNodes(apim, aca, 'gRPC');
      this.connectNodes(aca, cosmos, 'Read/Write');
      this.connectNodes(aca, bus, 'Publish');
      this.connectNodes(aca, openai, 'Embeddings');
      this.selection.select([]);
      return;
    }

    if (templateName === 'k8s_cluster') {
      this.addNode({ shapeType: 'group', provider: 'k8s', iconKey: 'k8s_cluster', iconColor: '#326CE5', label: 'Production K8s Namespace (prod-ns)', subtitle: 'Boundary', theme: 'blue', x: 265, y: 45, width: 760, height: 325 });
      const ing = this.addNode({ provider: 'k8s', iconKey: 'k8s_ing', iconColor: '#326CE5', label: 'Ingress Controller', subtitle: 'NGINX / Envoy', theme: 'emerald', x: 35, y: 170 });
      const svc = this.addNode({ provider: 'k8s', iconKey: 'k8s_svc', iconColor: '#326CE5', label: 'API Service', subtitle: 'ClusterIP :8080', theme: 'emerald', x: 290, y: 170 });
      const deploy = this.addNode({ provider: 'k8s', iconKey: 'k8s_deploy', iconColor: '#326CE5', label: 'Web Deployment', subtitle: '3 Pod Replicas', theme: 'blue', x: 545, y: 100 });
      const sts = this.addNode({ provider: 'k8s', iconKey: 'k8s_sts', iconColor: '#326CE5', label: 'StatefulSet DB', subtitle: 'Stateful Pods', theme: 'blue', x: 545, y: 245 });
      const cm = this.addNode({ provider: 'k8s', iconKey: 'k8s_cm', iconColor: '#326CE5', label: 'ConfigMap & Secret', subtitle: 'Runtime Config', theme: 'slate', x: 800, y: 100 });
      const pv = this.addNode({ provider: 'k8s', iconKey: 'k8s_pv', iconColor: '#326CE5', label: 'PersistentVolume', subtitle: 'SSD Block PVC', theme: 'blue', x: 800, y: 245 });

      this.connectNodes(ing, svc, 'Route');
      this.connectNodes(svc, deploy, 'Select');
      this.connectNodes(deploy, sts, 'SQL');
      this.connectNodes(deploy, cm, 'Mount');
      this.connectNodes(sts, pv, 'Claim');
      this.selection.select([]);
      return;
    }

    if (templateName === 'event_driven') {
      const client = this.addNode({ shapeType: 'client', label: 'Producer API', subtitle: 'Ingress', theme: 'rose', x: 50, y: 170 });
      const bus = this.addNode({ provider: 'gcp', iconKey: 'gcp_pubsub', iconColor: '#F29900', label: 'Cloud Pub/Sub', subtitle: 'Event Stream', theme: 'amber', x: 290, y: 170 });
      const workerA = this.addNode({ provider: 'gcp', iconKey: 'gcp_run', iconColor: '#4285F4', label: 'Billing Worker', subtitle: 'Cloud Run', theme: 'blue', x: 550, y: 95 });
      const workerB = this.addNode({ provider: 'gcp', iconKey: 'gcp_dataflow', iconColor: '#34A853', label: 'Streaming ETL', subtitle: 'Cloud Dataflow', theme: 'emerald', x: 550, y: 245 });
      const db = this.addNode({ provider: 'gcp', iconKey: 'gcp_bigquery', iconColor: '#4285F4', label: 'BigQuery Warehouse', subtitle: 'OLAP Store', theme: 'blue', x: 810, y: 170 });

      this.connectNodes(client, bus, 'Publish');
      this.connectNodes(bus, workerA, 'Push');
      this.connectNodes(bus, workerB, 'Pull');
      this.connectNodes(workerA, db, 'Write');
      this.connectNodes(workerB, db, 'Stream');
      this.selection.select([]);
      return;
    }

    if (templateName === 'rag_pipeline') {
      const user = this.addNode({ shapeType: 'client', label: 'User Prompt', subtitle: 'Client App', theme: 'rose', x: 45, y: 170 });
      const orchestrator = this.addNode({ provider: 'gcp', iconKey: 'gcp_run', iconColor: '#4285F4', label: 'RAG Orchestrator', subtitle: 'Cloud Run API', theme: 'blue', x: 285, y: 170 });
      const vectorDb = this.addNode({ provider: 'gcp', iconKey: 'gcp_sql', iconColor: '#4285F4', label: 'Cloud SQL pgvector', subtitle: 'Embeddings DB', theme: 'blue', x: 550, y: 90 });
      const llm = this.addNode({ provider: 'gcp', iconKey: 'gcp_vertex', iconColor: '#9334E6', label: 'Vertex AI Gemini', subtitle: 'Foundation LLM', theme: 'purple', x: 550, y: 250 });

      this.connectNodes(user, orchestrator, 'Query');
      this.connectNodes(orchestrator, vectorDb, 'Top-K Cosine');
      this.connectNodes(orchestrator, llm, 'Augmented Prompt');
      this.selection.select([]);
      return;
    }

    // Default: 'three_tier' (GCP 3-Tier Cloud Architecture)
    this.addNode({ shapeType: 'group', provider: 'gcp', iconColor: '#4285F4', label: 'Production GCP VPC (us-central1)', subtitle: 'Boundary', theme: 'blue', x: 265, y: 45, width: 760, height: 325 });
    const client = this.addNode({ shapeType: 'client', label: 'Web & Mobile Clients', subtitle: 'External', theme: 'rose', x: 35, y: 175 });
    const lb = this.addNode({ provider: 'gcp', iconKey: 'gcp_lb', iconColor: '#34A853', label: 'Cloud Load Balancing', subtitle: 'Global Anycast LB', theme: 'emerald', x: 290, y: 170 });
    const app = this.addNode({ provider: 'gcp', iconKey: 'gcp_run', iconColor: '#4285F4', label: 'Cloud Run API', subtitle: 'Stateless Compute', theme: 'blue', x: 545, y: 100 });
    const cache = this.addNode({ provider: 'gcp', iconKey: 'gcp_memorystore', iconColor: '#34A853', label: 'Memorystore Redis', subtitle: 'In-Memory Cache', theme: 'emerald', x: 545, y: 245 });
    const db = this.addNode({ provider: 'gcp', iconKey: 'gcp_sql', iconColor: '#4285F4', label: 'Cloud SQL Primary', subtitle: 'PostgreSQL HA', theme: 'blue', x: 800, y: 100 });

    this.connectNodes(client, lb, 'HTTPS');
    this.connectNodes(lb, app, 'Route');
    this.connectNodes(app, cache, 'Cache Lookup');
    this.connectNodes(app, db, 'Read / Write');
    this.selection.select([]);
  }

  /**
   * Serializes current canvas elements into an editable JSON diagram state.
   */
  toJSON(title = '') {
    const all = this.elementRegistry.getAll();
    const nodes = [];
    const connections = [];

    all.forEach(el => {
      if (el === this.root) return;
      if (el.waypoints) {
        connections.push({
          id: el.id,
          sourceId: el.source ? el.source.id : null,
          targetId: el.target ? el.target.id : null,
          waypoints: (el.waypoints || []).map(wp => ({ x: wp.x, y: wp.y })),
          label: el.nodeTitle !== undefined ? el.nodeTitle : (el.label || ''),
          theme: el.theme || 'slate'
        });
      } else {
        nodes.push({
          id: el.id,
          shapeType: el.shapeType || 'service',
          provider: el.provider || 'general',
          iconKey: el.iconKey || '',
          iconColor: el.iconColor || '',
          label: el.nodeTitle !== undefined ? el.nodeTitle : (el.label || 'Service'),
          subtitle: el.subtitle || '',
          theme: el.theme || 'slate',
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height
        });
      }
    });

    return {
      version: 1,
      generator: 'zenmark-diagram',
      title: title || 'Cloud Architecture Diagram',
      timestamp: Date.now(),
      nodes,
      connections
    };
  }

  /**
   * Reconstitutes canvas state from a serialized diagram JSON object.
   */
  loadJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid diagram JSON state');
    }

    this.clear();

    const nodes = data.nodes || [];
    const connections = data.connections || [];
    const nodeMap = new Map();

    // Add groups/boundaries first so child shapes can be placed on top
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.shapeType === 'group' && b.shapeType !== 'group') return -1;
      if (a.shapeType !== 'group' && b.shapeType === 'group') return 1;
      return 0;
    });

    for (const nodeData of sortedNodes) {
      const created = this.addNode({
        shapeType: nodeData.shapeType,
        provider: nodeData.provider,
        iconKey: nodeData.iconKey,
        iconColor: nodeData.iconColor,
        label: nodeData.label,
        subtitle: nodeData.subtitle,
        theme: nodeData.theme,
        x: nodeData.x,
        y: nodeData.y,
        width: nodeData.width,
        height: nodeData.height
      });
      if (nodeData.id) {
        nodeMap.set(nodeData.id, created);
      }
      if (created?.id) {
        nodeMap.set(created.id, created);
      }
    }

    for (const connData of connections) {
      const source = nodeMap.get(connData.sourceId);
      const target = nodeMap.get(connData.targetId);
      if (source && target) {
        this.connectNodes(source, target, {
          waypoints: connData.waypoints,
          label: connData.label,
          theme: connData.theme
        });
      }
    }

    setTimeout(() => this.zoomFit(), 60);
  }

  /**
   * Builds an isolated export SVG element, optionally embedding diagram JSON metadata for re-editing.
   */
  buildExportSvgElement(title = '', embedState = true) {
    this.selection.select([]);

    const elements = this.elementRegistry.filter(el => el !== this.root);
    if (elements.length === 0) {
      throw new Error('Canvas is empty. Add at least one shape before exporting.');
    }

    // Calculate bounding box across all shapes and connection waypoints
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      if (el.waypoints) {
        el.waypoints.forEach(pt => {
          minX = Math.min(minX, pt.x - 40);
          minY = Math.min(minY, pt.y - 24);
          maxX = Math.max(maxX, pt.x + 40);
          maxY = Math.max(maxY, pt.y + 24);
        });
      } else {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 184));
        maxY = Math.max(maxY, el.y + (el.height || 76));
      }
    });

    const pad = 36;
    const boxX = Math.floor(minX - pad);
    const boxY = Math.floor(minY - pad);
    const boxW = Math.ceil(maxX - minX + pad * 2);
    const boxH = Math.ceil(maxY - minY + pad * 2);

    const liveSvg = this.container.querySelector('svg');
    const viewport = liveSvg.querySelector('g.viewport');

    const cloneViewport = viewport.cloneNode(true);
    cloneViewport.setAttribute('transform', `translate(${-boxX}, ${-boxY})`);

    // Strip interactive hit boxes, outlines, and resizers from the export clone
    cloneViewport.querySelectorAll('.djs-outline, .djs-resizer, .djs-bendpoint, .djs-segment-dragger, .djs-hit').forEach(node => node.remove());

    const exportSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    exportSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    exportSvg.setAttribute('width', String(boxW));
    exportSvg.setAttribute('height', String(boxH));
    exportSvg.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`);

    // Embed Diagram JSON State into SVG Metadata for Full Re-editing (Excalidraw / Draw.io style)
    if (embedState) {
      const diagramState = this.toJSON(title);
      const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      metadata.setAttribute('id', 'zenmark-diagram-state');
      metadata.setAttribute('type', 'application/json');
      const jsonStr = JSON.stringify(diagramState);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      metadata.textContent = encoded;
      exportSvg.appendChild(metadata);
    }

    const defs = liveSvg.querySelector('defs');
    if (defs) {
      exportSvg.appendChild(defs.cloneNode(true));
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', String(boxW));
    bgRect.setAttribute('height', String(boxH));
    bgRect.setAttribute('rx', '16');
    bgRect.setAttribute('ry', '16');
    bgRect.setAttribute('fill', '#ffffff');
    exportSvg.appendChild(bgRect);

    exportSvg.appendChild(cloneViewport);

    return { exportSvg, boxW, boxH };
  }

  /**
   * Exports the diagram as an SVG string containing embedded editable metadata.
   */
  exportToSvgString(title = '', embedState = true) {
    const { exportSvg } = this.buildExportSvgElement(title, embedState);
    return new XMLSerializer().serializeToString(exportSvg);
  }

  /**
   * Exports the diagram as an SVG Blob with embedded editable metadata.
   */
  exportToSvgBlob(title = '', embedState = true) {
    const svgData = this.exportToSvgString(title, embedState);
    return new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  }

  /**
   * Exports the current diagram as a 2x Retina PNG Blob.
   */
  async exportToPngBlob(scale = 2, title = '') {
    const { exportSvg, boxW, boxH } = this.buildExportSvgElement(title, true);
    const svgData = new XMLSerializer().serializeToString(exportSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = boxW * scale;
        offscreen.height = boxH * scale;
        const ctx = offscreen.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, boxW, boxH);
        URL.revokeObjectURL(url);

        offscreen.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Failed to encode diagram PNG'));
          }
        }, 'image/png');
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  destroy() {
    if (this.diagram) {
      this.diagram.destroy();
      this.diagram = null;
    }
  }
}

/**
 * Extracts embedded diagram JSON state from an SVG text document.
 */
export function extractDiagramStateFromSvg(svgText) {
  if (!svgText || typeof svgText !== 'string') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const metadata = doc.querySelector('#zenmark-diagram-state, metadata[id="zenmark-diagram-state"]');
    if (!metadata) return null;
    const raw = (metadata.textContent || '').trim();
    if (!raw) return null;

    let jsonStr;
    try {
      jsonStr = decodeURIComponent(escape(atob(raw)));
    } catch {
      jsonStr = raw;
    }
    const parsed = JSON.parse(jsonStr);
    return parsed && Array.isArray(parsed.nodes) ? parsed : null;
  } catch (err) {
    console.warn('Failed to parse diagram state from SVG:', err);
    return null;
  }
}

export default CloudQubesDiagramStudio;
