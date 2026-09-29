import { Injectable } from '@angular/core'; import { CAMPUS_INSIGHTS,CAMPUS_LOCATIONS,CAMPUS_METRICS,INVESTIGATIONS } from '../data/campus-demo.data';
@Injectable({providedIn:'root'}) export class CampusDataService { locations=CAMPUS_LOCATIONS; metrics=CAMPUS_METRICS; insights=CAMPUS_INSIGHTS; investigation(id:string){return INVESTIGATIONS.find(item=>item.id===id);} }
