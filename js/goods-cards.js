(async () => {
  if (!window.HaroShop) return;
  try {
    const { products } = await HaroShop.getCatalog();
    document.querySelectorAll('.goods-card[data-product-id]').forEach(card => {
      const product = products.find(item => item.id === card.dataset.productId);
      if (!product) return;
      card.querySelector('.goods-card__title').textContent = product.name;
      card.querySelector('.goods-card__media').src = HaroShop.assetUrl(product.images[0]);
    });
  } catch { /* Keep the existing cards and their links available if JSON loading fails. */ }
})();
