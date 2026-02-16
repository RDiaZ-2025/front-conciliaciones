-- Add MaterialData column to ProductionRequests table
IF NOT EXISTS (
  SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'ProductionRequests' AND COLUMN_NAME = 'MaterialData'
)
BEGIN
    ALTER TABLE ProductionRequests
    ADD MaterialData NVARCHAR(MAX) NULL;
    
    PRINT 'Column MaterialData added to ProductionRequests table';
END
ELSE
BEGIN
    PRINT 'Column MaterialData already exists in ProductionRequests table';
END
