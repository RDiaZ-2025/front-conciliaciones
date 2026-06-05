import pytest
import os
from unittest.mock import patch, MagicMock
from datetime import date
from functions.Ingresos.ingresos_etl import _resolver_ruta_excel, importar_datos_redes_excel

def test_resolver_ruta_excel_found():
    with patch('os.path.exists', return_value=True):
        ruta = _resolver_ruta_excel('test.xlsx')
        assert 'test.xlsx' in ruta

def test_resolver_ruta_excel_not_found():
    with patch('os.path.exists', return_value=False):
        with pytest.raises(FileNotFoundError):
            _resolver_ruta_excel('nonexistent.xlsx')

@patch('functions.Ingresos.ingresos_etl._resolver_ruta_excel')
@patch('pandas.ExcelFile')
@patch('functions.Ingresos.ingresos_etl.guardar_ingresos_redes_excel')
@patch('functions.Ingresos.ingresos_etl.guardar_precio_dolar_excel')
def test_importar_datos_redes_excel(mock_guardar_precio, mock_guardar_redes, mock_excel_file, mock_resolver, db_session):
    mock_resolver.return_value = 'dummy.xlsx'
    
    # Mock Excel sheets
    mock_xl = MagicMock()
    mock_xl.sheet_names = ['Datos', 'Precio']
    
    # Mock sheet data
    mock_df_datos = MagicMock()
    mock_df_datos.parse.return_value = mock_df_datos # Simplified
    
    # We need to mock the behavior of parse and the resulting dataframe
    import pandas as pd
    df_datos = pd.DataFrame({
        'MES': ['2024-01'],
        'PLATAFORMA': ['YOUTUBE'],
        'RED+ TV': [100.0]
    })
    df_precios = pd.DataFrame({
        'MES': ['2024-01'],
        'Precio': [4000.0]
    })
    
    def side_effect(sheet_name):
        if sheet_name == 'Datos':
            return df_datos
        if sheet_name == 'Precio':
            return df_precios
        return pd.DataFrame()
        
    mock_xl.parse.side_effect = side_effect
    mock_excel_file.return_value = mock_xl
    
    importar_datos_redes_excel(db_session, 'dummy.xlsx')
    
    assert mock_guardar_redes.called
    assert mock_guardar_precio.called
    
    # Check if data was processed (dates converted)
    args_redes = mock_guardar_redes.call_args[0][1]
    assert args_redes[0]['MES'] == date(2024, 1, 1)