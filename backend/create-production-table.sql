-- Create production_requests table for SQL Server
-- This script creates the production_requests table with proper SQL Server syntax

PRINT 'Creating production_requests table...';

-- Create production_requests table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='production_requests' AND xtype='U')
BEGIN
    CREATE TABLE production_requests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        requestDate DATETIME NOT NULL,
        department NVARCHAR(255) NOT NULL,
        contactPerson NVARCHAR(255) NOT NULL,
        assignedTeam NVARCHAR(255) NOT NULL,
        deliveryDate DATETIME NULL,
        observations NVARCHAR(MAX) NULL,
        stage NVARCHAR(50) NOT NULL DEFAULT 'request'
    );
    
    PRINT 'production_requests table created successfully';
END
ELSE
BEGIN
    PRINT 'production_requests table already exists';
END

-- Create index for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_production_requests_requestDate')
BEGIN
    CREATE INDEX IX_production_requests_requestDate ON production_requests(requestDate DESC);
    PRINT 'Index IX_production_requests_requestDate created';
END

-- Create index for stage filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_production_requests_stage')
BEGIN
    CREATE INDEX IX_production_requests_stage ON production_requests(stage);
    PRINT 'Index IX_production_requests_stage created';
END

PRINT 'production_requests table setup completed successfully';