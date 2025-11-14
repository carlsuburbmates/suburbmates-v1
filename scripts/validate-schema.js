#!/usr/bin/env node

/**
 * Schema Validation Script for Suburbmates V1.1
 * 
 * This script compares the current Supabase schema against the V1.1 requirements
 * and generates a migration plan to align them.
 * 
 * Usage: node scripts/validate-schema.js
 */

const fs = require('fs');
const path = require('path');

// V1.1 Schema Requirements from documentation
const V1_1_SCHEMA_REQUIREMENTS = {
  tables: {
    users: {
      fields: {
        id: 'UUID PRIMARY KEY',
        email: 'TEXT UNIQUE NOT NULL',
        user_type: "CHECK (user_type IN ('business_owner', 'customer'))",
        created_at: 'TIMESTAMPTZ DEFAULT NOW()',
        created_as_business_owner_at: 'TIMESTAMPTZ'
      }
    },
    business_profiles: {
      fields: {
        id: 'UUID PRIMARY KEY',
        user_id: 'UUID UNIQUE NOT NULL REFERENCES users(id)',
        business_name: 'TEXT NOT NULL',
        slug: 'TEXT UNIQUE NOT NULL',
        profile_description: 'TEXT',
        is_vendor: 'BOOLEAN DEFAULT false',
        vendor_tier: "VARCHAR(10) DEFAULT 'none'",
        vendor_status: "VARCHAR(20) DEFAULT 'inactive'",
        category_id: 'INTEGER REFERENCES categories(id)',
        suburb_id: 'INTEGER REFERENCES lgas(id)',
        is_public: 'BOOLEAN DEFAULT true',
        created_at: 'TIMESTAMPTZ DEFAULT NOW()',
        updated_at: 'TIMESTAMPTZ DEFAULT NOW()'
      }
    },
    vendors: {
      fields: {
        id: 'UUID PRIMARY KEY',
        user_id: 'UUID UNIQUE NOT NULL REFERENCES users(id)',
        tier: "CHECK (tier IN ('none', 'basic', 'pro', 'suspended'))",
        can_sell_products: 'BOOLEAN DEFAULT false',
        stripe_account_id: 'TEXT UNIQUE',
        stripe_account_status: "TEXT DEFAULT 'pending'",
        created_at: 'TIMESTAMPTZ DEFAULT NOW()',
        updated_at: 'TIMESTAMPTZ DEFAULT NOW()'
      }
    },
    products: {
      fields: {
        id: 'UUID PRIMARY KEY',
        vendor_id: 'UUID NOT NULL REFERENCES vendors(id)',
        name: 'TEXT NOT NULL',
        description: 'TEXT',
        price: 'INTEGER NOT NULL',
        slug: 'TEXT UNIQUE NOT NULL',
        category_id: 'INTEGER REFERENCES categories(id)',
        published: 'BOOLEAN DEFAULT false',
        lga_id: 'INTEGER REFERENCES lgas(id)',
        created_at: 'TIMESTAMPTZ DEFAULT NOW()',
        updated_at: 'TIMESTAMPTZ DEFAULT NOW()'
      }
    },
    orders: {
      fields: {
        id: 'UUID PRIMARY KEY',
        customer_id: 'UUID REFERENCES users(id)',
        vendor_id: 'UUID REFERENCES vendors(id)',
        product_id: 'UUID REFERENCES products(id)',
        amount_cents: 'INTEGER NOT NULL',
        commission_cents: 'INTEGER DEFAULT 0',
        vendor_net_cents: 'INTEGER NOT NULL',
        stripe_payment_intent_id: 'TEXT',
        status: "CHECK (status IN ('pending', 'succeeded', 'failed', 'reversed'))",
        created_at: 'TIMESTAMPTZ DEFAULT NOW()'
      }
    }
  }
};

// Current schema from migrations
function parseCurrentSchema() {
  const migrationFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql'
  ];
  
  const currentSchema = {
    tables: {},
    indexes: {},
    constraints: {}
  };
  
  migrationFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      parseSQLFile(content, currentSchema);
    }
  });
  
  return currentSchema;
}

function parseSQLFile(content, schema) {
  // Extract CREATE TABLE statements
  const tableMatches = content.match(/CREATE TABLE (\w+)\s*\([^;]+;/g);
  
  if (tableMatches) {
    tableMatches.forEach(tableSQL => {
      const tableName = tableSQL.match(/CREATE TABLE (\w+)/)[1];
      const fields = extractFields(tableSQL);
      
      schema.tables[tableName] = {
        fields,
        sql: tableSQL
      };
    });
  }
  
  // Extract indexes
  const indexMatches = content.match(/CREATE (?:UNIQUE )?INDEX \w+ ON (\w+)/g);
  if (indexMatches) {
    indexMatches.forEach(indexSQL => {
      const tableName = indexSQL.match(/ON (\w+)/)[1];
      if (!schema.indexes[tableName]) schema.indexes[tableName] = [];
      schema.indexes[tableName].push(indexSQL);
    });
  }
}

function extractFields(tableSQL) {
  const fields = {};
  const fieldMatches = tableSQL.match(/\n\s+(\w+)\s+[^,]+/g);
  
  if (fieldMatches) {
    fieldMatches.forEach(fieldDef => {
      const fieldMatch = fieldDef.match(/\s+(\w+)\s+([^,\n]+)/);
      if (fieldMatch) {
        const [, fieldName, fieldType] = fieldMatch;
        fields[fieldName] = fieldType.trim();
      }
    });
  }
  
  return fields;
}

function compareSchemas(current, target) {
  const analysis = {
    missingTables: [],
    missingFields: {},
    incorrectFields: {},
    extraFields: {},
    migrationPlan: []
  };
  
  // Check for missing tables
  Object.keys(target.tables).forEach(tableName => {
    if (!current.tables[tableName]) {
      analysis.missingTables.push(tableName);
      analysis.migrationPlan.push(`CREATE TABLE ${tableName} with V1.1 schema`);
    }
  });
  
  // Check for missing or incorrect fields in existing tables
  Object.keys(target.tables).forEach(tableName => {
    if (current.tables[tableName]) {
      const currentFields = current.tables[tableName].fields;
      const targetFields = target.tables[tableName].fields;
      
      // Check for missing fields
      Object.keys(targetFields).forEach(fieldName => {
        if (!currentFields[fieldName]) {
          if (!analysis.missingFields[tableName]) analysis.missingFields[tableName] = [];
          analysis.missingFields[tableName].push(fieldName);
          analysis.migrationPlan.push(`ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${targetFields[fieldName]}`);
        } else if (!fieldMatches(currentFields[fieldName], targetFields[fieldName])) {
          if (!analysis.incorrectFields[tableName]) analysis.incorrectFields[tableName] = [];
          analysis.incorrectFields[tableName].push({
            field: fieldName,
            current: currentFields[fieldName],
            target: targetFields[fieldName]
          });
          analysis.migrationPlan.push(`ALTER TABLE ${tableName} ALTER COLUMN ${fieldName} TYPE ${targetFields[fieldName]}`);
        }
      });
      
      // Check for extra fields
      Object.keys(currentFields).forEach(fieldName => {
        if (!targetFields[fieldName] && fieldName !== 'id' && fieldName !== 'created_at' && fieldName !== 'updated_at') {
          if (!analysis.extraFields[tableName]) analysis.extraFields[tableName] = [];
          analysis.extraFields[tableName].push(fieldName);
        }
      });
    }
  });
  
  return analysis;
}

function fieldMatches(current, target) {
  // Simple field matching - could be enhanced for complex types
  if (target.includes('CHECK') && current.includes('CHECK')) return true;
  if (target.includes('REFERENCES') && current.includes('REFERENCES')) return true;
  if (target.includes('UNIQUE') && current.includes('UNIQUE')) return true;
  
  const currentBase = current.split(' ').slice(0, 2).join(' ');
  const targetBase = target.split(' ').slice(0, 2).join(' ');
  return currentBase === targetBase;
}

function generateMigrationSQL(analysis) {
  let sql = '-- Suburbmates V1.1 Schema Migration\n';
  sql += '-- Generated on: ' + new Date().toISOString() + '\n\n';
  
  // Create missing tables
  if (analysis.missingTables.length > 0) {
    sql += '-- Create missing tables\n';
    analysis.missingTables.forEach(tableName => {
      const tableDef = generateTableSQL(tableName, V1_1_SCHEMA_REQUIREMENTS.tables[tableName]);
      sql += tableDef + '\n\n';
    });
  }
  
  // Add missing fields
  Object.keys(analysis.missingFields).forEach(tableName => {
    sql += `-- Add missing fields to ${tableName}\n`;
    analysis.missingFields[tableName].forEach(fieldName => {
      const fieldType = V1_1_SCHEMA_REQUIREMENTS.tables[tableName].fields[fieldName];
      sql += `ALTER TABLE ${tableName} ADD COLUMN ${fieldName} ${fieldType};\n`;
    });
    sql += '\n';
  });
  
  // Update incorrect fields
  Object.keys(analysis.incorrectFields).forEach(tableName => {
    sql += `-- Update incorrect fields in ${tableName}\n`;
    analysis.incorrectFields[tableName].forEach(fieldInfo => {
      sql += `-- TODO: Update ${tableName}.${fieldInfo.field} from ${fieldInfo.current} to ${fieldInfo.target}\n`;
    });
    sql += '\n';
  });
  
  // Add triggers
  sql += '-- Add auto-creation triggers\n';
  sql += generateBusinessProfileTrigger() + '\n\n';
  
  // Add indexes
  sql += '-- Add performance indexes\n';
  sql += generatePerformanceIndexes() + '\n\n';
  
  return sql;
}

function generateTableSQL(tableName, tableDef) {
  let sql = `CREATE TABLE ${tableName} (\n`;
  
  // Add id field
  sql += '  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n';
  
  // Add defined fields
  Object.keys(tableDef.fields).forEach(fieldName => {
    if (fieldName !== 'id') {
      const fieldType = tableDef.fields[fieldName];
      sql += `  ${fieldName} ${fieldType},\n`;
    }
  });
  
  // Add timestamps
  if (!tableDef.fields.created_at) {
    sql += '  created_at TIMESTAMPTZ DEFAULT NOW(),\n';
  }
  if (!tableDef.fields.updated_at && tableName !== 'orders') {
    sql += '  updated_at TIMESTAMPTZ DEFAULT NOW(),\n';
  }
  
  sql = sql.slice(0, -2) + '\n);'; // Remove last comma and add semicolon
  
  return sql;
}

function generateBusinessProfileTrigger() {
  return `CREATE OR REPLACE FUNCTION create_business_profile_for_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_type = 'business_owner' THEN
        INSERT INTO business_profiles (user_id, business_name, slug, created_as_business_owner_at)
        VALUES (NEW.id, 'New Business', 'new-business-' || NEW.id, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_business_profile
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_business_profile_for_owner();`;
}

function generatePerformanceIndexes() {
  return `-- Index for business profile lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug);

-- Index for vendor lookups  
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);

-- Index for product filtering
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_lga_id ON products(lga_id);

-- Index for order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);`;
}

// Main execution
function main() {
  console.log('🔍 Analyzing Suburbmates schema against V1.1 requirements...\n');
  
  const currentSchema = parseCurrentSchema();
  const analysis = compareSchemas(currentSchema, V1_1_SCHEMA_REQUIREMENTS);
  
  console.log('📊 Schema Analysis Results:\n');
  
  // Summary
  console.log(`Missing Tables: ${analysis.missingTables.length}`);
  console.log(`Tables with Missing Fields: ${Object.keys(analysis.missingFields).length}`);
  console.log(`Tables with Incorrect Fields: ${Object.keys(analysis.incorrectFields).length}`);
  console.log(`Tables with Extra Fields: ${Object.keys(analysis.extraFields).length}\n`);
  
  // Detailed analysis
  if (analysis.missingTables.length > 0) {
    console.log('❌ Missing Tables:');
    analysis.missingTables.forEach(table => console.log(`  - ${table}`));
    console.log();
  }
  
  if (Object.keys(analysis.missingFields).length > 0) {
    console.log('❌ Missing Fields:');
    Object.keys(analysis.missingFields).forEach(table => {
      console.log(`  ${table}:`);
      analysis.missingFields[table].forEach(field => console.log(`    - ${field}`));
    });
    console.log();
  }
  
  if (Object.keys(analysis.incorrectFields).length > 0) {
    console.log('⚠️  Incorrect Fields:');
    Object.keys(analysis.incorrectFields).forEach(table => {
      console.log(`  ${table}:`);
      analysis.incorrectFields[table].forEach(fieldInfo => {
        console.log(`    - ${fieldInfo.field}: ${fieldInfo.current} → ${fieldInfo.target}`);
      });
    });
    console.log();
  }
  
  if (Object.keys(analysis.extraFields).length > 0) {
    console.log('ℹ️  Extra Fields (can be preserved):');
    Object.keys(analysis.extraFields).forEach(table => {
      console.log(`  ${table}:`);
      analysis.extraFields[table].forEach(field => console.log(`    - ${field}`));
    });
    console.log();
  }
  
  // Generate migration script
  const migrationSQL = generateMigrationSQL(analysis);
  const outputPath = 'supabase/migrations/003_v11_schema_alignment.sql';
  
  fs.writeFileSync(outputPath, migrationSQL);
  console.log(`✅ Migration script generated: ${outputPath}`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Review the migration script');
  console.log('2. Test the migration in a development environment');
  console.log('3. Update RLS policies for new schema');
  console.log('4. Run the migration before Phase 1 implementation');
}

if (require.main === module) {
  main();
}

module.exports = {
  parseCurrentSchema,
  compareSchemas,
  generateMigrationSQL
};