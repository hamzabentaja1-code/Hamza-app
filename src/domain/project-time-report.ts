import {ProjectRecord} from '../projects';

export type ProjectTimeReportRow={
  projectId:number;
  technicianId?:number;
  date:string;
  projectName:string;
  customerName:string;
  technician:string;
  hours:number;
  hourlyRate:number;
  laborCost:number;
  note:string;
};

export type TechnicianWorkSummary={
  technicianId?:number;
  technician:string;
  workEntryCount:number;
  projectCount:number;
  hours:number;
  laborCostCentimes:number;
};

/** Flatten the saved project work logs into rows suitable for date filtering and export. */
export function buildProjectTimeReport(projects:readonly ProjectRecord[]):ProjectTimeReportRow[]{
  return projects.flatMap(project=>project.timeEntries.map(entry=>({
    projectId:project.id,
    ...(entry.technicianId===undefined?{}:{technicianId:entry.technicianId}),
    date:entry.date,
    projectName:project.name,
    customerName:project.customerName,
    technician:entry.technician,
    hours:entry.hours,
    hourlyRate:entry.hourlyRate,
    laborCost:Math.round(entry.hours*entry.hourlyRate*100)/100,
    note:entry.note||'',
  })));
}

/** Aggregate the already-filtered time rows by saved technician profile, falling back to normalized name for legacy entries. */
export function summarizeTechnicianWork(rows:readonly ProjectTimeReportRow[]):TechnicianWorkSummary[]{
  const grouped=new Map<string,TechnicianWorkSummary & {projectIds:Set<number>}>();
  for(const row of rows){
    const nameKey=row.technician.trim().normalize('NFKC').toLocaleLowerCase();
    const key=row.technicianId===undefined?`name:${nameKey}`:`id:${row.technicianId}`;
    const item=grouped.get(key)||{...(row.technicianId===undefined?{}:{technicianId:row.technicianId}),technician:row.technician.trim(),workEntryCount:0,projectCount:0,hours:0,laborCostCentimes:0,projectIds:new Set<number>()};
    item.workEntryCount++;
    item.hours=Math.round((item.hours+row.hours)*100)/100;
    item.laborCostCentimes+=Math.round(row.hours*row.hourlyRate*100);
    item.projectIds.add(row.projectId);
    grouped.set(key,item);
  }
  return [...grouped.values()].map(({projectIds,...item})=>({...item,projectCount:projectIds.size}))
    .sort((a,b)=>b.laborCostCentimes-a.laborCostCentimes||a.technician.localeCompare(b.technician));
}
