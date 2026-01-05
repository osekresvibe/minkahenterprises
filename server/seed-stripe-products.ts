import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  console.log('Creating Stripe products...');
  
  const stripe = await getUncachableStripeClient();

  // Check if product already exists
  const existingProducts = await stripe.products.search({ 
    query: "name:'MinkahEnterprises Platform Subscription'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Product already exists:', existingProducts.data[0].id);
    return;
  }

  // Create the main subscription product
  const product = await stripe.products.create({
    name: 'MinkahEnterprises Platform Subscription',
    description: 'Full access to the MinkahEnterprises community management platform including member management, events, messaging, and more.',
    metadata: {
      type: 'subscription',
      tier: 'standard',
    },
  });
  console.log('Created product:', product.id);

  // Create the $80/month price
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 8000, // $80.00 in cents
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      billing_period: 'monthly',
    },
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $80/month');

  // Optionally create a yearly price with discount
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 76800, // $768.00/year ($64/month - 20% discount)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: {
      billing_period: 'yearly',
      discount: '20%',
    },
  });
  console.log('Created yearly price:', yearlyPrice.id, '- $768/year (20% discount)');

  console.log('\n=== Stripe Products Created ===');
  console.log('Product ID:', product.id);
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
  console.log('\nThese will sync automatically to your database via webhooks.');
}

createProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error creating products:', error);
    process.exit(1);
  });
