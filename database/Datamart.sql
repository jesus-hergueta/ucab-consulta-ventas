-- 1. Dimensión Tiempo
CREATE TABLE DimTiempo (
    sk_tiempo INT PRIMARY KEY,
    fecha DATE NOT NULL,
    anio INT NOT NULL,
    semestre INT NOT NULL,
    trimestre VARCHAR(10) NOT NULL,
    mes_numero INT NOT NULL,
    mes_nombre VARCHAR(20) NOT NULL,
    anio_mes VARCHAR(10) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL,
    es_fin_de_semana BOOLEAN NOT NULL
);

-- 2. Dimensión Producto
CREATE TABLE DimProducto (
    sk_producto INT PRIMARY KEY,
    nk_codigo_producto VARCHAR(50) NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    estado_producto VARCHAR(50) NOT NULL
);

-- 3. Dimensión Cliente (SCD Tipo 2 con fechas de vigencia)
CREATE TABLE DimCliente (
    sk_cliente INT PRIMARY KEY,
    nk_id_cliente VARCHAR(50) NOT NULL,
    nombre_cliente VARCHAR(150) NOT NULL,
    segmento VARCHAR(100) NOT NULL,
    tipo_cliente VARCHAR(50) NOT NULL,
    ciudad_cliente VARCHAR(100) NOT NULL,
    fecha_inicio_vigencia DATE NOT NULL,
    fecha_fin_vigencia DATE,
    es_actual BOOLEAN NOT NULL
);

-- 4. Dimensión Sucursal
CREATE TABLE DimSucursal (
    sk_sucursal INT PRIMARY KEY,
    nk_codigo_sucursal VARCHAR(50) NOT NULL,
    nombre_sucursal VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    tipo_tienda VARCHAR(50) NOT NULL
);

-- 5. Dimensión Canal
CREATE TABLE DimCanal (
    sk_canal INT PRIMARY KEY,
    nk_codigo_canal VARCHAR(50) NOT NULL,
    nombre_canal VARCHAR(100) NOT NULL,
    tipo_canal VARCHAR(50) NOT NULL,
    comision_canal_pct DECIMAL(5, 2) NOT NULL
);

-- 6. Tabla de Hechos FactVentas
CREATE TABLE FactVentas (
    id_hecho_venta BIGINT PRIMARY KEY,
    sk_tiempo INT NOT NULL,
    sk_producto INT NOT NULL,
    sk_cliente INT NOT NULL,
    sk_sucursal INT NOT NULL,
    sk_canal INT NOT NULL,
    id_transaccion_dd VARCHAR(50) NOT NULL, -- Degenerate Dimension
    linea_transaccion INT NOT NULL,
    cantidad_vendida INT NOT NULL,
    precio_unitario_venta DECIMAL(12, 2) NOT NULL,
    costo_unitario DECIMAL(12, 2) NOT NULL,
    ingreso_bruto DECIMAL(12, 2) NOT NULL,
    monto_descuento DECIMAL(12, 2) NOT NULL,
    ingreso_neto DECIMAL(12, 2) NOT NULL,
    costo_total DECIMAL(12, 2) NOT NULL,
    margen_bruto DECIMAL(12, 2) NOT NULL,
    stock_disponible_post_venta INT NOT NULL,
    
    -- Relaciones de Claves Foráneas (FK)
    CONSTRAINT fk_fact_tiempo FOREIGN KEY (sk_tiempo) REFERENCES DimTiempo(sk_tiempo),
    CONSTRAINT fk_fact_producto FOREIGN KEY (sk_producto) REFERENCES DimProducto(sk_producto),
    CONSTRAINT fk_fact_cliente FOREIGN KEY (sk_cliente) REFERENCES DimCliente(sk_cliente),
    CONSTRAINT fk_fact_sucursal FOREIGN KEY (sk_sucursal) REFERENCES DimSucursal(sk_sucursal),
    CONSTRAINT fk_fact_canal FOREIGN KEY (sk_canal) REFERENCES DimCanal(sk_canal)
);