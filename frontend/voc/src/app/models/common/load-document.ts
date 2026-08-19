export interface LoadDocument {
  Id: number;
  IdUser: number;
  IdFolder: string; // GUID
  Fecha: string; // Date string
  Status: string;
  FileName: string;
  UserEmail?: string;
  UserName?: string;
}