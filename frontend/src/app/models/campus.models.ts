export type Severity='normal'|'attention'|'warning';
export interface CampusLocation { id:string; name:string; shortLabel:string; state:Severity; x:number; y:number; width:number; height:number; detail:string; }
export interface CampusMetric { label:string; value:string; note:string; tone:'cyan'|'green'|'amber'; }
export interface CampusInsight { id:string; icon:string; title:string; location:string; description:string; severity:Severity; }
export interface Evidence { label:string; value:string; detail:string; }
export interface Recommendation { title:string; reason:string; requiresHumanApproval:boolean; }
export interface Agent { name:string; role:string; }
export interface Investigation { id:string; location:string; title:string; hero:string; isDemoData:boolean; chart:{baseline:number[];observed:number[]}; evidence:Evidence[]; trail:{stage:string; text:string}[]; recommendation:Recommendation; agent:Agent; timestamp:string; comparisonPeriod:string; }
