import { Routes } from '@angular/router';
import { CommandCenterComponent } from './features/command-center/command-center.component';
import { InvestigationPageComponent } from './features/investigation/investigation-page.component';
export const routes: Routes = [{path:'command-center',component:CommandCenterComponent},{path:'investigation/:id',component:InvestigationPageComponent},{path:'',pathMatch:'full',redirectTo:'command-center'},{path:'**',redirectTo:'command-center'}];
