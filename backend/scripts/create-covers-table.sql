IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Covers15Minutes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Covers15Minutes](
        [id] [int] IDENTITY(1,1) NOT NULL,
        [uploaderLog] [nvarchar](max) NOT NULL,
        [timestamp] [datetime] NOT NULL,
        [url] [nvarchar](max) NOT NULL,
        CONSTRAINT [PK_Covers15Minutes] PRIMARY KEY CLUSTERED 
        (
            [id] ASC
        )
    )
END
GO
