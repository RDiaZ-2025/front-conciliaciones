-- Create production_requests table
CREATE TABLE IF NOT EXISTS production_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  requestDate TEXT NOT NULL,
  department TEXT NOT NULL,
  contactPerson TEXT NOT NULL,
  assignedTeam TEXT NOT NULL,
  deliveryDate TEXT,
  observations TEXT,
  stage TEXT NOT NULL DEFAULT 'request'
);