from datetime import datetime
from tinydb import TinyDB

db = TinyDB('bdoo_agente.json')
tabla_trazas = db.table('trazabilidad_interacciones')

class Usuario:
    def __init__(self, id_usuario: str, nombre: str, rol: str):
        self.id_usuario = id_usuario
        self.nombre = nombre
        self.rol = rol

class Pregunta:
    def __init__(self, id_pregunta: str, texto_original: str):
        self.id_pregunta = id_pregunta
        self.texto_original = texto_original
        self.timestamp = datetime.now().isoformat()

class Intencion:
    def __init__(self, tipo: str, metrica: str, dimension: str, periodo: str):
        self.tipo = tipo
        self.metrica = metrica
        self.dimension = dimension
        self.periodo = periodo

class FuenteDato:
    def __init__(self, tabla_hechos: str, dimensiones: list):
        self.tabla_hechos = tabla_hechos
        self.dimensiones = dimensiones

class ConsultaAnalitica:
    def __init__(self, sql_generado: str, parametros: dict):
        self.sql_generado = sql_generado
        self.parametros = parametros

class ReglaValidacion:
    def __init__(self, nombre_regla: str, aprobada: bool, detalle: str):
        self.nombre_regla = nombre_regla
        self.aprobada = aprobada
        self.detalle = detalle

class ResultadoConsulta:
    def __init__(self, datos_raw: list, filas_afectadas: int, esta_vacio: bool):
        self.datos_raw = datos_raw
        self.filas_afectadas = filas_afectadas
        self.esta_vacio = esta_vacio

class RespuestaAgente:
    def __init__(self, texto: str, regla_calculo: str, advertencias: str = None):
        self.texto = texto
        self.regla_calculo = regla_calculo
        self.advertencias = advertencias

class Sesion:
    def __init__(self, id_sesion: str, usuario: Usuario):
        self.id_sesion = id_sesion
        self.usuario = usuario
        self.fecha_inicio = datetime.now().isoformat()

class AgenteAnalitico:
    def __init__(self, id_agente: str, version: str):
        self.id_agente = id_agente
        self.version = version

    def guardar_interaccion(
        self, 
        sesion: Sesion, 
        pregunta: Pregunta, 
        intencion: Intencion, 
        fuente: FuenteDato, 
        consulta: ConsultaAnalitica, 
        validacion: ReglaValidacion, 
        resultado: ResultadoConsulta, 
        respuesta: RespuestaAgente
    ):
        traza_objeto = {
            "agente_id": self.id_agente,
            "version_agente": self.version,
            "sesion": {
                "id_sesion": sesion.id_sesion,
                "fecha_inicio": sesion.fecha_inicio,
                "usuario": sesion.usuario.__dict__
            },
            "pregunta": pregunta.__dict__,
            "intencion": intencion.__dict__,
            "fuente_dato": fuente.__dict__,
            "consulta_analitica": consulta.__dict__,
            "regla_validacion": validacion.__dict__,
            "resultado_consulta": resultado.__dict__,
            "respuesta_agente": respuesta.__dict__,
            "timestamp_registro": datetime.now().isoformat()
        }
        
        id_doc = tabla_trazas.insert(traza_objeto)
        print(f"¡Éxito! Traza guardada en BDOO Local ('bdoo_agente.json') con ID: {id_doc}")


