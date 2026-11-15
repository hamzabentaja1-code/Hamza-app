import {ProjectRecord} from '../projects';

export type ProjectTimeReportRow={
  date:string;
  projectName:string;
  customerName:string;
  technician:string;
  hours:number;
  hourlyRate:number;
  laborCost:number;
  note:string;
};

/** Flatten the saved project work logs into rows suitable for date filtering and export. */
export function buildProjectTimeReport(projects:readonly ProjectRecord[]):ProjectTimeReportRow[]{
  return projects.flatMap(project=>project.timeEntries.map(entry=>({
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
