/**
 * paginate.js - Utilidad de paginación para MongoDB
 * Estandariza respuestas paginadas
 */

const paginate = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 50,
    sort = { createdAt: -1 },
    populate = [],
    select = null
  } = options;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  // Construir query base
  let queryBuilder = model.find(query);

  // Populate
  populate.forEach(p => {
    queryBuilder = queryBuilder.populate(p);
  });

  // Select
  if (select) {
    queryBuilder = queryBuilder.select(select);
  }

  // Ejecutar queries en paralelo
  const [data, total] = await Promise.all([
    queryBuilder
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    model.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? pageNum + 1 : null,
      prevPage: hasPrevPage ? pageNum - 1 : null
    }
  };
};

module.exports = paginate;
