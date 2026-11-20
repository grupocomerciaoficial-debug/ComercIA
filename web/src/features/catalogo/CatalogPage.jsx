import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Archive,
  ArrowRight,
  Check,
  CircleAlert,
  CircleDollarSign,
  Ellipsis,
  Gift,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Shapes,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { productSchema } from '../../shared/lib/schemas.js';
import { formatCOP } from '../../shared/lib/format.js';
import { useProductAction, useProducts } from '../../shared/hooks/useData.js';
import {
  Button,
  FilterPill,
  FormField,
  Modal,
  PageTitle,
  SearchInput,
  StatusBadge,
} from '../../shared/ui/Components.jsx';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  emptyBusqueda,
  emptyCatalogo,
} from '../../shared/ui/Feedback.jsx';
import { useToast } from '../../app/providers.jsx';

const EMPTY_PRODUCTS = [];
const categoryIcons = {
  peluches: Package,
  peluchería: Package,
  detalles: Gift,
  accesorios: Tag,
  papelería: Archive,
  empaques: Package,
};

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(''),
    [availability, setAvailability] = useState(
      params.get('disponibilidad') === 'agotado' ? 'agotado' : 'Todos',
    ),
    [category, setCategory] = useState('Todos'),
    [editing, setEditing] = useState(null),
    [remove, setRemove] = useState(null);
  const query = useProducts({ query: search, availability });
  const action = useProductAction('save'),
    toggle = useProductAction('availability'),
    removeAction = useProductAction('delete');
  const toast = useToast();
  const products = query.data ?? EMPTY_PRODUCTS;
  const categories = useMemo(
    () => [
      ['Todos', Shapes],
      ...[...new Set(products.map((product) => product.categoria).filter(Boolean))].map((name) => [
        name,
        categoryIcons[name.toLocaleLowerCase('es')] || Tag,
      ]),
    ],
    [products],
  );
  const filtered = useMemo(
    () =>
      category === 'Todos'
        ? products
        : products.filter(
            (p) => p.categoria?.toLocaleLowerCase('es') === category.toLocaleLowerCase('es'),
          ),
    [products, category],
  );
  const startNew = () =>
    setEditing({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: '',
      disponibilidad: 'disponible',
    });
  const handleAvailability = async (product) => {
    try {
      await toggle.mutateAsync({
        id: product.id,
        value: product.disponibilidad === 'disponible' ? 'agotado' : 'disponible',
      });
      toast(
        product.disponibilidad === 'disponible'
          ? 'Producto marcado como agotado.'
          : 'Producto disponible para pedidos.',
      );
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  async function confirmRemove() {
    try {
      await removeAction.mutateAsync({ id: remove.id });
      toast('Producto retirado del catálogo. Los pedidos anteriores conservan su copia.');
      setRemove(null);
    } catch (e) {
      toast(e.message, 'error');
    }
  }
  return (
    <div className="page-enter catalog-page">
      <PageTitle
        eyebrow="LO QUE TU TIENDA OFRECE"
        title={
          <>
            Un catálogo que <em>sí eres tú.</em>
          </>
        }
        description="Mantén al día lo que el asistente le cuenta a cada cliente."
        actions={
          <Button variant="primary" icon={Plus} onClick={startNew}>
            Agregar producto
          </Button>
        }
      />
      <section className="catalog-hero">
        <div className="catalog-hero-copy">
          <span className="catalog-hero-kicker">
            <SparkleIcon /> TU VITRINA, SIEMPRE AL DÍA
          </span>
          <h3>
            Tu inventario habla
            <br />
            por tu tienda.
          </h3>
          <p>Un cambio de disponibilidad se refleja en lo que el bot ofrece a tus clientes.</p>
          <div className="catalog-hero-stats">
            <span>
              <b>{products.length.toString().padStart(2, '0')}</b>
              <small>referencias</small>
            </span>
            <i />
            <span>
              <b>
                {products
                  .filter((p) => p.disponibilidad === 'disponible')
                  .length.toString()
                  .padStart(2, '0')}
              </b>
              <small>disponibles</small>
            </span>
            <i />
            <span>
              <b>
                {products
                  .filter((p) => p.disponibilidad === 'agotado')
                  .length.toString()
                  .padStart(2, '0')}
              </b>
              <small>por reponer</small>
            </span>
          </div>
        </div>
        <div className="catalog-hero-art">
          <div className="catalog-tile tile-main">
            <Gift size={29} />
            <span>Un detalle para cada ocasión</span>
          </div>
          <div className="catalog-tile tile-small">
            <span>✳</span>
            <b>Hecho para ti</b>
          </div>
          <div className="catalog-orbit orbit-catalog-a" />
          <div className="catalog-orbit orbit-catalog-b" />
          <span className="catalog-art-star">✳</span>
        </div>
      </section>
      <section className="catalog-toolbar">
        <div className="catalog-toolbar-copy">
          <span className="section-eyebrow">TU MOSTRADOR DIGITAL</span>
          <h3>
            {category === 'Todos' ? 'Productos de tu tienda' : category}
            <span>{filtered.length}</span>
          </h3>
        </div>
        <div className="catalog-controls">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto…" />
          <div className="filter-strip">
            {[
              ['Todos', 'all'],
              ['Disponible', 'disponible'],
              ['Agotado', 'agotado'],
            ].map(([label, val]) => (
              <FilterPill
                key={val}
                active={availability === val}
                onClick={() => {
                  setAvailability(val);
                  setParams(val === 'Todos' ? {} : { disponibilidad: val });
                }}
              >
                {label}
              </FilterPill>
            ))}
          </div>
        </div>
      </section>
      <section className="category-strip">
        {categories.map(([name, Icon]) => (
          <button
            key={name}
            className={`category-chip ${category === name ? 'active' : ''}`}
            onClick={() => setCategory(name)}
          >
            <Icon size={15} />
            {name}
            <span>
              {name === 'Todos'
                ? products.length
                : products.filter(
                    (p) => p.categoria?.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'),
                  ).length}
            </span>
          </button>
        ))}
      </section>
      {query.isLoading ? (
        <div className="catalog-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="product-skeleton" key={i}>
              <Skeleton rows={3} />
            </div>
          ))}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onEdit={() => setEditing(product)}
              onToggle={() => handleAvailability(product)}
              onDelete={() => setRemove(product)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={search ? emptyBusqueda : emptyCatalogo}
          icon={Search}
          title="No encontramos ese producto"
          description="Prueba otro nombre, categoría o disponibilidad."
          action={search && <Button onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
        />
      )}
      <section className="catalog-footnote">
        <span>
          <CircleAlert size={15} /> Precio en pesos colombianos, sin decimales. No se manejan
          cantidades de inventario.
        </span>
        <button onClick={() => setCategory('Todos')}>
          Ver catálogo completo <ArrowRight size={14} />
        </button>
      </section>
      <ProductEditor
        product={editing}
        categories={products.map((p) => p.categoria)}
        saving={action.isPending}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          try {
            const categoryName =
              products.find((p) => p.categoria.toLowerCase() === data.categoria.toLowerCase())
                ?.categoria || data.categoria;
            await action.mutateAsync({
              id: editing.id || undefined,
              data: { ...data, categoria: categoryName },
            });
            toast(editing.id ? 'Cambios guardados.' : 'El producto ya está en tu catálogo.');
            setEditing(null);
          } catch (e) {
            toast(e.message, 'error');
          }
        }}
      />
      <Modal
        open={!!remove}
        size="small"
        title="Retirar del catálogo"
        description="El producto no aparecerá al consultar el catálogo."
        onClose={() => setRemove(null)}
        footer={
          <>
            <Button onClick={() => setRemove(null)}>Conservar producto</Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={removeAction.isPending}
              onClick={confirmRemove}
            >
              Retirar producto
            </Button>
          </>
        }
      >
        <div className="remove-confirm">
          <span>
            <PackageX size={20} />
          </span>
          <p>
            ¿Quieres retirar <b>{remove?.nombre}</b>? Los pedidos anteriores conservarán su nombre y
            precio.
          </p>
        </div>
      </Modal>
    </div>
  );
}
function ProductCard({ product, index, onEdit, onToggle, onDelete }) {
  const image = product.categoria?.toLowerCase().includes('peluche')
    ? 'toys'
    : product.categoria?.toLowerCase().includes('detalle')
      ? 'redeem'
      : product.categoria?.toLowerCase().includes('accesorio')
        ? 'interests'
        : 'inventory_2';
  return (
    <article className="product-card" style={{ '--card-index': index }}>
      <div className={`product-card-art art-${index % 6}`}>
        <span className="product-art-index">{String(index + 1).padStart(2, '0')}</span>
        <span className="product-illustration">
          {image === 'toys' ? (
            <Package size={31} />
          ) : image === 'redeem' ? (
            <Gift size={31} />
          ) : image === 'interests' ? (
            <Shapes size={31} />
          ) : (
            <PackageCheck size={31} />
          )}
        </span>
        <span className="art-caption">{product.categoria}</span>
        <button className="product-more" onClick={onEdit} aria-label={`Editar ${product.nombre}`}>
          <Ellipsis size={17} />
        </button>
      </div>
      <div className="product-card-body">
        <div className="product-status-line">
          <StatusBadge status={product.disponibilidad} />
          <span className="product-category-label">{product.categoria}</span>
        </div>
        <h3>{product.nombre}</h3>
        <p>{product.descripcion || 'Un producto especial de tu tienda.'}</p>
        <div className="product-card-bottom">
          <div>
            <small>Precio al cliente</small>
            <strong>{formatCOP(product.precio)}</strong>
          </div>
          <div className="product-card-actions">
            <button
              className={`availability-action ${product.disponibilidad}`}
              onClick={onToggle}
              title={
                product.disponibilidad === 'disponible' ? 'Marcar agotado' : 'Marcar disponible'
              }
            >
              {product.disponibilidad === 'disponible' ? (
                <PackageX size={15} />
              ) : (
                <PackageCheck size={15} />
              )}
            </button>
            <button className="edit-product-action" onClick={onEdit}>
              Editar
            </button>
            <button
              className="availability-action"
              onClick={onDelete}
              title="Retirar del catálogo"
              aria-label={`Retirar ${product.nombre} del catálogo`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
function ProductEditor({ product, categories, saving, onClose, onSave }) {
  const editing = Boolean(product?.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: '',
      disponibilidad: 'disponible',
    },
  });
  useEffect(() => {
    if (product) reset(product);
  }, [product, reset]);
  const submit = handleSubmit(onSave);
  return (
    <Modal
      open={!!product}
      title={editing ? 'Editar producto' : 'Un producto nuevo'}
      description={
        editing
          ? 'Actualiza los datos de este producto.'
          : 'Añade algo nuevo a la vitrina de tu tienda.'
      }
      onClose={onClose}
      size="medium"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={editing ? Check : Plus} loading={saving} onClick={submit}>
            {editing ? 'Guardar cambios' : 'Agregar producto'}
          </Button>
        </>
      }
    >
      <form className="product-form" onSubmit={submit}>
        <FormField id="nombre" label="Nombre del producto" error={errors.nombre?.message} required>
          <input
            id="nombre"
            placeholder="Ej. Peluche oso clásico"
            maxLength={100}
            {...register('nombre')}
          />
        </FormField>
        <FormField
          id="descripcion"
          label="Descripción"
          hint="Cuéntale al cliente lo esencial, con tus palabras."
          error={errors.descripcion?.message}
        >
          <textarea
            id="descripcion"
            rows={3}
            maxLength={500}
            placeholder="Color, tamaño, materiales…"
            {...register('descripcion')}
          />
        </FormField>
        <div className="form-two-col">
          <FormField id="precio" label="Precio en pesos" error={errors.precio?.message} required>
            <span className="price-input">
              <i>$</i>
              <input
                id="precio"
                inputMode="numeric"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                {...register('precio')}
              />
              <small>COP</small>
            </span>
          </FormField>
          <FormField id="categoria" label="Categoría" error={errors.categoria?.message} required>
            <input
              id="categoria"
              list="product-categories"
              placeholder="Ej. Peluches"
              maxLength={50}
              {...register('categoria')}
            />
            <datalist id="product-categories">
              {[...new Set(categories)].map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </FormField>
        </div>
        <fieldset className="availability-field">
          <legend>¿Está disponible ahora?</legend>
          <label>
            <input type="radio" value="disponible" {...register('disponibilidad')} />
            <span className="availability-choice">
              <PackageCheck size={16} />
              <b>Disponible</b>
              <small>El bot puede ofrecerlo.</small>
            </span>
          </label>
          <label>
            <input type="radio" value="agotado" {...register('disponibilidad')} />
            <span className="availability-choice">
              <PackageX size={16} />
              <b>Agotado</b>
              <small>No aparecerá como opción.</small>
            </span>
          </label>
        </fieldset>
        <div className="no-image-note">
          <CircleAlert size={14} />
          El panel no solicita fotos de productos en esta versión.
        </div>
      </form>
    </Modal>
  );
}
function SparkleIcon() {
  return <span className="sparkle-small">✳</span>;
}
