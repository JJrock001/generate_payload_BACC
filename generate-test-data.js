#!/usr/bin/env node
/**
 * BAAC CBS Collateral Test Data Generator
 * Reads planning CSV → generates Postman iteration data file
 * Skips Type 4 (บัญชีเงินฝาก) — requires real bank accounts
 *
 * Usage: node generate-test-data.js
 * Output:
 *   - postman-data.json      → import to Postman Collection Runner
 *   - tracking-sheet.csv     → give to leader (fill CIF/coll_id after run)
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const PLANNING_CSV = '/Users/nachaphonmaleewong/Downloads/BAAC-PHOENIX-COLL-DATA2569_V.0.0.csv';
const OUTPUT_DIR   = __dirname;
const BRANCH_CODE  = '611';

// ─── SEED DATA ──────────────────────────────────────────────────────────────
const THAI_FIRST = ['เกษตรกร','สมชาย','ยอดชาย','มานะ','ปิติ','วีระ','ชูใจ','ดวงใจ','สมหญิง','มณี',
                    'สมหมาย','วิชาย','สวัสดิ์','จิระ','นิวัติ','สุรชัย','ประเสริฐ','ชัยวัฒน์','อนันต์','บุญมี'];
const THAI_LAST  = ['ทดสอบ','ใจดี','รักชาติ','ขยันยิ่ง','มั่งมี','ศรีสุข','เจริญทรัพย์','มั่นคง',
                    'ฤทธิ์','นวลวรรณ','วงศ์ทอง','สุขสวัสดิ์','ดีงาม','รุ่งเรือง','พงษ์ทอง'];
const EN_FIRST   = ['Farmer','Somchai','Yodchai','Mana','Piti','Veera','Choojai','Duangjai','Somying','Manee'];
const EN_LAST    = ['Test','Jaidee','Rakchart','Mungmee','Srisuk','Jaroensup','Mankong','Rit'];
const CORP_TH    = ['สหกรณ์การเกษตรสาธิต จำกัด','บริษัทมั่งมีศรีสุข จำกัด','ห้างหุ้นส่วนจำกัด ร่ำรวย',
                    'สหกรณ์ออมทรัพย์ทดสอบ จำกัด','กลุ่มเกษตรกรทดสอบ','สหกรณ์ร้านค้าสาธิต จำกัด'];
const CORP_EN    = ['Satit Agriculture Coop','Mungmee Srisuk Co.,Ltd.','Rumruay Part.,Ltd.','Test Coop'];

const GRADES       = ['B','A','AA','AAA','AAA+'];
const PROVINCES    = ['10','16','11','14','041'];
const DISTRICTS    = ['01','02','16','03'];
const SUB_DISTRICTS= ['09','06','04','15','001'];
const PERSONAL_TYPES = new Set(['603','600']);

// ─── HELPERS ────────────────────────────────────────────────────────────────
const rand     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick     = arr => arr[Math.floor(Math.random() * arr.length)];

const genCitizenId = () => {
  let id = '', sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = i === 0 ? rand(1, 8) : rand(0, 9);
    id += d; sum += d * (13 - i);
  }
  return id + ((11 - (sum % 11)) % 10);
};

const genDate = (startY, endY) => {
  const y = rand(startY, endY);
  return `${y}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const futureDate = yrs => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yrs);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

/** Convert Thai Buddhist Era date "DD/MM/YYYY" → "YYYY-MM-DD" CE */
const beToAD = str => {
  if (!str || !str.trim()) return null;
  const m = str.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const yearCE = parseInt(m[3]) > 2500 ? parseInt(m[3]) - 543 : parseInt(m[3]);
  return `${yearCE}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
};

/** Strip commas and .00 from "1,500,000.00" → "1500000" */
const cleanAmount = str => {
  if (!str || !str.trim()) return null;
  return str.replace(/,/g,'').replace(/\.00\s*$/,'').trim() || null;
};

const genAddr = () => {
  const prov = pick(PROVINCES), dist = pick(DISTRICTS), sub = pick(SUB_DISTRICTS);
  return {
    address1: `ที่อยู่ทดสอบ ${rand(1,999)}`,
    address2: `หมู่บ้าน ${pick(THAI_FIRST)}`,
    address3: `ถนน ${pick(THAI_LAST)}`,
    address4: '',
    moo: `${rand(1,15)}`,
    country: 'TH',
    province: prov,
    district: dist,
    sub_district: sub,
    zip: `${prov}${rand(100,999)}`,
    house_hold_number: `${rand(1,99)}`
  };
};

const genRegAddr = () => {
  const prov = pick(PROVINCES), dist = pick(DISTRICTS), sub = pick(SUB_DISTRICTS);
  return {
    address1: `${rand(1,999)}`,
    address2: `ซอย ${rand(1,99)}`,
    address3: '', address4: '',
    moo: `${rand(1,15)}`,
    sub_district: sub, district: dist, province: prov,
    country: 'TH',
    zip: `${prov}${rand(100,999)}`
  };
};

// ─── PAYLOAD BUILDERS ────────────────────────────────────────────────────────

const buildPersonal = (custType, idx) => ({
  citizen_id: genCitizenId(),
  customer_title: 'นาย',
  customer_first_name: pick(THAI_FIRST),
  customer_middle_name: '',
  customer_last_name: pick(THAI_LAST),
  english_customer_title: 'MR.',
  english_first_name: pick(EN_FIRST),
  english_middle_name: '',
  english_last_name: pick(EN_LAST),
  permanent_address: genAddr(),
  mailing_address: genAddr(),
  office_address: genAddr(),
  date_of_birth: genDate(1960, 2000),
  date_of_birth_code: '1',
  date_of_death: '',
  number_of_dependents: `${rand(0,5)}`,
  spouse_citizen_id: '', spouse_title: '', spouse_name: '', spouse_last_name: '',
  religion: '1',
  sex: pick(['M','F']),
  income: '4', marital: 'S', education: '9',
  occupation: '01', sub_occupation: '04',
  ministry_code1: '90000', ministry_code2: '99000', ministry_code3: '99999',
  nationality: 'TH', residency: 'TH',
  home_phone: `02${rand(1000000,9999999)}`,
  home_phone_ext: '',
  mobile_phone: `08${rand(10000000,99999999)}`,
  office_phone: `02${rand(1000000,9999999)}`,
  office_phone_ext: '', fax_phone: '',
  email: `testuser${idx}@baac.test`,
  customer: custType,
  employee_id: '',
  citizen_card: {
    issue_center: 'พระนคร',
    issue_date: genDate(2015, 2022),
    expire_date: genDate(2025, 2032)
  },
  risk_rating: '2',
  branch_code: BRANCH_CODE,
  user_id: '1'
});

const buildCorporate = (custType, idx) => ({
  customer: custType,
  registered_date: today(),
  customer_title: custType === '707' ? 'สหกรณ์การเกษตร' : custType === '500' ? 'บริษัท' : 'สหกรณ์',
  customer_name: pick(CORP_TH),
  english_customer_title: 'Group',
  english_customer_name: pick(CORP_EN),
  permanent_address: genAddr(),
  mailing_address: genAddr(),
  office_address: genAddr(),
  business_info: {
    establish_objective: 'ทดสอบระบบ CBS',
    nationality: 'TH', residency: 'TH',
    total_assets: `${rand(1,50)}000000.00`,
    liability: '0.00',
    expense: `${rand(1,10)}000000.00`,
    net_profit: `${rand(1,10)}000000.00`,
    cash_flow: `${rand(1,10)}000000.00`,
    capital: `${rand(5,20)}000000.00`,
    registered_capital: `${rand(10,30)}000000.00`,
    paidup_capital: '200000.00',
    annual_sales: `${rand(10,50)}000000.00`,
    net_worth: '15000000.00',
    last_financial_update: genDate(2020, 2023),
    risk_rating: '1', credit_line: '444000000.00',
    ISIC_section: 'A01', ISIC_group: '010', ISIC_specific_code: '0100'
  },
  contact_info: {
    office_phone: `02${rand(1000000,9999999)}`, office_phone_ext: '111',
    factory_phone: `02${rand(1000000,9999999)}`, factory_phone_ext: '222',
    mobile_phone: `08${rand(10000000,99999999)}`,
    fax_phone: `02${rand(1000000,9999999)}`,
    email: `corp${idx}@baac.test`
  },
  BOT_info: {
    tax_id: genCitizenId(), bot_assigned_code: '456', boi_flag: 'false',
    juristic_id: genCitizenId(),
    juristic_registered_date: genDate(2010, 2020),
    swift_code: '55555', government_document_number: '66666',
    fi_code: '001', fi_assigned_code: '002',
    inter_org_oversea_gov_id: '003', oversea_juristic_id: '004', other_juristic_id: '005'
  },
  other_card_info: {
    other_id_type: '3',
    other_id_number: `3A-${rand(10000,99999)}`,
    issue_center: 'บางแค',
    issue_date: genDate(2015, 2018),
    expire_date: genDate(2024, 2028)
  },
  customer_group_info: {
    customer_group_flag: 'true', group_type_code: '1', group_activity_code: '2',
    group_product_name: 'Test', group_common_occupation: '7',
    group_establish_date: genDate(2015, 2020),
    group_establish_member: '10', group_current_member: '100',
    group_objective: 'ทดสอบ CBS'
  },
  branch_code: BRANCH_CODE,
  user_id: '1'
});

/** Registration body — customer_id placeholder replaced by Postman pre-request script */
const buildRegistration = (grade) => ({
  customer_id: '__CIF__',
  branch_of_ownership: BRANCH_CODE,
  group_code: '',
  loan_region: BRANCH_CODE,
  customer_status: '0',
  customer_grade: grade,
  registered_date: today(),
  customer_address: genRegAddr(),
  bank_district_code: '1423',
  old_group_code: BRANCH_CODE,
  registered_status: '00',
  updated_user_id: '1',
  subsidy: {
    subsidy_plan: '', maximum_subsidy_amount: '', available_subsidy_amount: '',
    subsidy_customer_status: '', subsidy_customer_unaccrue_flag: 'false', subsidy_customer_type: ''
  },
  rehabilitation_customer: {
    rehabilitation_customer_flag: 'false', rehabilitation_round: '', rehabilitation_date: ''
  },
  branch_code: BRANCH_CODE,
  user_id: '1'
});

/** Full collateral base with all fields empty (same as HTML generator) */
const collBase = (collType, botCode, subBotCode, contractDate) => ({
  coll_type: collType,
  collateral_description: '',
  coll_subtype: '0',
  bot_coll_code: botCode,
  sub_bot_coll_code: subBotCode || '',
  remarks: 'Create_PHOENIX',
  aprs_date: today(),
  aprs_value: '',
  aprs_by: '1', aprs_tax_id: '',
  aprs_boo: BRANCH_CODE,
  province: '041', district: '001', sub_district: '001',
  road: '', build_code: '', buid_soi: '', land_info: '',
  coll_branch: BRANCH_CODE,
  aprs_value_reason: '',
  land_no: '',
  coll_cost_center: `200${BRANCH_CODE}`,
  coll_response_unit: `200${BRANCH_CODE}`,
  land_volume_1: '', land_volume_2: '', land_volume_3: '', land_volume_4: '',
  ravang: '', land_value: '', build_value: '',
  partial_pledge_flag: '', owner_portion: '', total_portion: '',
  own_land_volume_1: '', own_land_volume_2: '', own_land_volume_3: '',
  guarantor_cif_no: '',
  build_type: '', number_of_floors: '',
  machine_reg_code_start: '', machine_reg_code_end: '',
  engine_capacity: '', unit_of_engine_capacity: '',
  purchase_price: '', market_value_flag: '',
  used_start_date: '', use_age: '', ruling_cost: '', useful_life: '',
  account_no: '',
  bond_code: '', issuance_year: '', bond_sequence: '',
  bond_start_number: '', bond_end_number: '', bond_type: '', bond_expire_date: '',
  bond_int_rate: '', bond_unit_price: '', bond_owner_name: '',
  notional_value: '', total_bond_value: '',
  seniority: '', symbol: '', cer_no: '',
  stock_issue_name: '', stock_short_name: '', stock_type: '', listed_on_stock: '',
  tax_id: '', shareholder_reg_no: '', stock_holder_name: '', stock_number: '',
  stock_issue_date: '', number_of_shares: '',
  stock_par_price: '', stock_par_date: '', stock_book_price: '', stock_book_date: '',
  stock_market_price: '', stock_market_date: '',
  stock_issuer_risk_rate: '', stock_risk_weight_of_collateral: '', stock_holder_ratio: '',
  room_no: '', build_reg_no: '', build_storey: '', build_no: '', build_name: '', room_area: '',
  concession_contract_rights_no: '', concession_contract_rights_date: '',
  rights_value: '', date_of_transfer: '', rights_balance: '', as_of_lease_loan_date: '',
  company_or_government_name: '', branch_of_trafer_rights: '',
  type_of_commudity: '',
  insurance_capital_price: '', insurance_market_price: '', firstclass_insurance_flag: '',
  rental_agreement_reg_no: '', rental_agreement_issuer: '', rental_agreement_type: '',
  rental_agreement_expire_date: '', rental_agreement_duration: '',
  asset_to_equity_agreement_no: '', asset_to_equity_agreement_issuer: '',
  asset_to_equity_agreement_issue_date: '', asset_to_equity_agreement_expire_date: '',
  lg_no: '', lg_issue_date: '',
  salak_account_no: '', cert_no: '', lottery_low_no: '', lottery_high_no: '',
  salak_group: '', salak_period: '', lottery_unit: '',
  cert_balance: '', cert_record_no: '',
  exeed_present_value: '', total_present_value: '',
  pawn_no: '', pawn_weight: '', pawn_product_code: '', pawn_product_type: '',
  pawn_product_kind: '', pawn_cif: '', pawn_storage_date_end: '', pawn_company: '',
  ticket_type: '', ticket_no: '', ticket_issuer: '', ticket_date: '', ticket_due_date: '',
  document_date: '',
  land_doc_subtype: '',
  ground_no: '', book_no: '', page_no: '',
  custom_enddate_collateral_date: contractDate || genDate(2028, 2035),
  seq_no: '',
  user_id: '1',
  created_branch: BRANCH_CODE,
  appraisal_officer_1: `นาย ${pick(THAI_LAST)} ${pick(THAI_FIRST)}`,
  appraisal_officer_2: '',
  appraisal_officer_3: ''
});

/**
 * Build type-specific collateral payload
 * Returns { payload, aprsValue }
 */
const buildCollateral = (collType, botCode, rawBotStr, accTypeStr, existingAprs, contractDate) => {
  // Determine sub_bot_coll_code from raw bot string notation e.g. "286011 - เครื่องจักร (1)"
  let subBot = '0';
  const subMatch = rawBotStr.match(/\((\d+)\)\s*[-–]?\s*(?!ต้น|อาคาร)/);
  if (rawBotStr.includes('เครื่องจักร (1)')) subBot = '1';
  else if (rawBotStr.includes('เครื่องจักร (2)')) subBot = '2';
  else if (rawBotStr.includes('ไม้ยืนต้น')) subBot = '2';

  const base = collBase(collType, botCode, subBot, contractDate);

  let overrides = {};
  let aprsValue = existingAprs;

  switch (collType) {

    // ── Type 1: ที่ดิน ────────────────────────────────────────────────────
    case '1': {
      const landVal = aprsValue
        ? (botCode === '286006' ? Math.round(parseInt(aprsValue) * 0.65) : parseInt(aprsValue))
        : rand(2, 50) * 1000000;
      const buildVal = (botCode === '286006')
        ? (aprsValue ? Math.round(parseInt(aprsValue) * 0.35) : rand(1, 10) * 100000)
        : '';
      aprsValue = aprsValue || `${landVal + (parseInt(buildVal)||0)}`;

      overrides = {
        coll_subtype: '1',
        land_no: `${rand(100000, 999999)}`,
        land_volume_1: `${rand(1, 10)}`,
        land_volume_2: `${rand(0, 3)}`,
        land_volume_3: `${rand(0, 99)}`,
        land_volume_4: '0',
        land_value: `${landVal}`,
        build_value: buildVal ? `${buildVal}` : '',
        ...(botCode === '286006' ? { build_type: `${rand(1, 7)}` } : {})
      };
      break;
    }

    // ── Type 2: สิ่งปลูกสร้าง ────────────────────────────────────────────
    case '2': {
      aprsValue = aprsValue || `${rand(5, 50) * 100000}`;
      // ไม้ยืนต้น → build_type 9, อื่นๆ → random 1-8 excl 8
      const buildType = rawBotStr.includes('ไม้ยืนต้น') ? '9' : `${rand(1, 7)}`;
      // sub_bot: 286006(อื่นๆ) → 0-ที่ดิน, 286004 → 0
      const s2SubBot = rawBotStr.includes('286006') ? (rawBotStr.includes('ไม้ยืนต้น') ? '2' : '0') : '0';
      overrides = {
        bot_coll_code: botCode,
        sub_bot_coll_code: s2SubBot,
        build_no: `${rand(1, 999)}`,
        build_type: buildType,
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 3: เครื่องจักร ──────────────────────────────────────────────
    case '3': {
      aprsValue = aprsValue || `${rand(5, 50) * 100000}`;
      const codeStart = rand(1, 99999);
      const usefulLife = rand(15, 40);
      overrides = {
        sub_bot_coll_code: subBot,
        aprs_value: aprsValue,
        machine_reg_code_start: `${codeStart}`,
        machine_reg_code_end: `${codeStart + rand(1, 5)}`,
        engine_capacity: '100',
        unit_of_engine_capacity: '1',
        purchase_price: `${Math.round(parseInt(aprsValue) * 1.05)}`,
        used_start_date: today(),
        use_age: `${rand(1, usefulLife - 5)}`,
        ruling_cost: `${Math.round(parseInt(aprsValue) * 0.97)}`,
        useful_life: `${usefulLife}`
      };
      break;
    }

    // ── Type 5: พันธบัตร ─────────────────────────────────────────────────
    case '5': {
      // Parse expiry range from accTypeStr: "(1) ผู้กู้ 4-8 ปี"
      let minYrs = 0, maxYrs = 4;
      if (accTypeStr.includes('4-8'))       { minYrs = 4;  maxYrs = 8;  }
      else if (accTypeStr.includes('8-12')) { minYrs = 8;  maxYrs = 12; }
      else if (accTypeStr.includes('12-16')){ minYrs = 12; maxYrs = 16; }
      else if (accTypeStr.includes('>16') || accTypeStr.includes('16-')) { minYrs = 16; maxYrs = 30; }

      const bondStart = 1, bondEnd = 100, unitPrice = 1000;
      const totalBond = (bondEnd - bondStart + 1) * unitPrice;
      aprsValue = aprsValue || `${totalBond}`;

      overrides = {
        coll_subtype: '0',
        bond_code: '001',
        issuance_year: `${new Date().getFullYear()}`,
        bond_sequence: '1',
        bond_start_number: `${bondStart}`,
        bond_end_number: `${bondEnd}`,
        bond_type: '5',
        bond_expire_date: futureDate(rand(minYrs, maxYrs)),
        bond_int_rate: `${rand(1, 10)}`,
        bond_unit_price: `${unitPrice}`,
        bond_owner_name: `เจ้าของพันธบัตร ${rand(1, 999)}`,
        total_bond_value: `${totalBond}`,
        stock_book_date: today(),
        stock_market_price: '500',
        stock_market_date: today(),
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 8: คอนโด/อาคารชุด ──────────────────────────────────────────
    case '8': {
      aprsValue = aprsValue || `${rand(10, 80) * 100000}`;
      // 286008 อาคารชุด vs 286008 อื่นๆ
      const s8BotCode = rawBotStr.includes('อาคารชุด') ? '286066' : '286008';
      overrides = {
        coll_subtype: '0',
        bot_coll_code: s8BotCode,
        sub_bot_coll_code: '0',
        room_no: `${rand(1,999)} / ${rand(1,999)}`,
        build_reg_no: `${rand(1, 100)}`,
        build_storey: `${rand(1, 20)}`,
        build_no: `${rand(1,100)} / ${rand(1,100)}`,
        build_name: 'BAAC Tower Test',
        room_area: `${rand(24, 200)}`,
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 13: หนังสือค้ำประกัน ────────────────────────────────────────
    case '13': {
      aprsValue = aprsValue || `${rand(10, 100) * 100000}`;
      // Subtype from bot code notation: 286061 (1)=บสย., (2)=บสย.รัฐ, (3)=กองทุน, (4)=กระทรวง
      let lgSubtype = '1';
      if      (rawBotStr.includes('(2)')) lgSubtype = '2';
      else if (rawBotStr.includes('(3)')) lgSubtype = '3';
      else if (rawBotStr.includes('(4)')) lgSubtype = '4';

      overrides = {
        coll_subtype: lgSubtype,
        bot_coll_code: '286061',
        sub_bot_coll_code: '0',
        lg_no: `${rand(100000000, 999999999)}`,
        lg_issue_date: today(),
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 14: สลาก ────────────────────────────────────────────────────
    case '14': {
      aprsValue = aprsValue || `${rand(10, 50) * 100000}`;
      overrides = {
        coll_subtype: '0',
        bot_coll_code: '286023',
        sub_bot_coll_code: '0',
        salak_account_no: `${rand(400000000000, 499999999999)}`,
        cert_no: `${rand(100000000000, 999999999999)}`,
        salak_group: `${pick(['A','B','C','D','E','F','G'])}${pick(['ก','ข','ซ','ฎ','ฑ','ธ','ต'])}`,
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 17: อสังหาริมทรัพย์อื่นๆ (ส.ป.ก.) ──────────────────────────
    case '17': {
      aprsValue = aprsValue || `${rand(3, 20) * 100000}`;
      // land_doc_subtype from raw bot string "286008 (5) - โฉนดสปก."
      const docMatch = rawBotStr.match(/\((\d+)\)/);
      const landDocSubtype = docMatch ? docMatch[1] : `${rand(1, 19)}`;

      overrides = {
        coll_subtype: '1',
        bot_coll_code: '286008',
        sub_bot_coll_code: '',
        land_doc_subtype: landDocSubtype,
        land_no: `${rand(100000, 999999)}`,
        land_volume_1: `${rand(1, 10)}`,
        land_volume_2: `${rand(0, 3)}`,
        land_volume_3: `${rand(0, 99)}`,
        land_volume_4: '0',
        land_value: aprsValue,
        build_value: '0',
        build_type: `${rand(1, 7)}`,
        document_date: today(),
        aprs_value: aprsValue
      };
      break;
    }

    // ── Type 99: อื่นๆ (สินค้าคงคลัง / เรือ) ────────────────────────────
    case '99': {
      aprsValue = aprsValue || `${rand(5, 50) * 100000}`;
      const isShip = rawBotStr.includes('286039') || rawBotStr.includes('เรือ');
      // Product type from bot string "286214 (3) - ข้าวโพด" → type_of_commudity = "3"
      const prodMatch = rawBotStr.match(/\((\d+)\)/);
      const commudity = prodMatch ? prodMatch[1] : '';

      overrides = {
        coll_subtype: '0',
        bot_coll_code: isShip ? '286039' : '286214',
        sub_bot_coll_code: '0',
        collateral_description: isShip ? 'เรือประมง' : 'สินค้าคงคลัง',
        type_of_commudity: isShip ? '' : commudity,
        aprs_value: aprsValue
      };
      break;
    }

    default:
      aprsValue = aprsValue || `${rand(5, 20) * 100000}`;
      overrides = { aprs_value: aprsValue };
  }

  const payload = { ...base, ...overrides };
  // Ensure aprs_value is set
  if (!payload.aprs_value && aprsValue) payload.aprs_value = aprsValue;

  return { payload, aprsValue: payload.aprs_value || aprsValue || '' };
};

// ─── OWNER BODY TEMPLATE (placeholders replaced by Postman) ────────────────
const buildOwnerTemplate = () => ({
  coll_id: '__COLL_ID__',
  customer_id: '__CIF__',
  partial_pledge_owner_flag: 'false',
  user_id: '1',
  created_branch: BRANCH_CODE
});

// ─── CSV PARSER (handles quoted fields with embedded commas/newlines) ────────
const parseCSV = content => {
  const rows = [];
  const lines = content.split('\n');
  let i = 1; // skip header

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    const cols = [];
    let cur = '', inQ = false, j = 0;

    while (j < line.length) {
      const ch = line[j];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
      j++;
    }
    cols.push(cur.trim());
    rows.push(cols);
    i++;
  }
  return rows;
};

// ─── EXTRACT COLLATERAL TYPE NUMBER ─────────────────────────────────────────
const parseCollType = raw => {
  const m = (raw || '').trim().match(/^(\d+)/);
  return m ? m[1] : '';
};

// ─── EXTRACT BOT CODE (6-digit number) ─────────────────────────────────────
const parseBotCode = raw => {
  const m = (raw || '').trim().match(/^(\d{6})/);
  return m ? m[1] : '';
};

// ─── EXTRACT CUSTOMER TYPE CODE ─────────────────────────────────────────────
const parseCustType = raw => {
  const m = (raw || '').match(/\((\d+)\)/);
  return m ? m[1] : '603';
};

// ─── PARSE GRADE ─────────────────────────────────────────────────────────────
const parseGrade = raw => {
  const g = (raw || '').trim();
  return GRADES.includes(g) ? g : pick(GRADES);
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
console.log('\n🏦  BAAC CBS Test Data Generator\n' + '─'.repeat(50));
console.log(`📂  Reading: ${path.basename(PLANNING_CSV)}`);

const csvContent = fs.readFileSync(PLANNING_CSV, 'utf-8');
const rows = parseCSV(csvContent);
console.log(`✅  Parsed ${rows.length} rows`);

const postmanData  = [];
const trackingRows = [];
const skipped      = [];

let idx = 1;
for (const row of rows) {
  const seq         = row[0] || '';
  const collTypeRaw = row[8] || '';
  const collType    = parseCollType(collTypeRaw);

  if (!collType) continue;

  // ── SKIP TYPE 4 ──────────────────────────────────────────────────────────
  if (collType === '4') {
    skipped.push(seq);
    continue;
  }

  // ── PARSE ROW FIELDS ──────────────────────────────────────────────────────
  const custTypeCode  = parseCustType(row[4]);
  const isPersonal    = PERSONAL_TYPES.has(custTypeCode);
  const grade         = parseGrade(row[5]);
  const existingCIF   = (row[6] || '').trim();
  const existingCollId= (row[7] || '').trim();
  const rawBotStr     = row[9] || '';
  const botCode       = parseBotCode(rawBotStr);
  const aprsRaw       = cleanAmount(row[12]);
  const accTypeStr    = row[14] || '';   // used for bond expiry / deposit sub-type
  const contractDateRaw = row[16] || '';
  const contractDate  = beToAD(contractDateRaw) || genDate(2028, 2035);

  // ── BUILD PAYLOADS ─────────────────────────────────────────────────────────
  const customerBody   = isPersonal
    ? buildPersonal(custTypeCode, idx)
    : buildCorporate(custTypeCode, idx);

  const registrationBody = buildRegistration(grade);

  const { payload: collBody, aprsValue } = buildCollateral(
    collType, botCode, rawBotStr, accTypeStr, aprsRaw, contractDate
  );

  const ownerBody = buildOwnerTemplate();

  // ── ASSEMBLE ITERATION OBJECT FOR POSTMAN ─────────────────────────────────
  postmanData.push({
    // ── Meta (for reference only, not used in API calls)
    seq,
    test_desc:           `Seq${seq} | ${collTypeRaw.split(',')[0].trim()} | ${row[4]} | Grade:${grade}`,
    cif_existing:        existingCIF,
    coll_id_existing:    existingCollId,

    // ── Step selector: "personal" or "corporate"
    customer_api_type:   isPersonal ? 'personal' : 'corporate',

    // ── Pre-built request bodies (stringified JSON)
    // Postman pre-request script will JSON.parse() these
    create_customer_body:     JSON.stringify({ rqBody: customerBody }),
    create_registration_body: JSON.stringify({ rqBody: registrationBody }),
    create_collateral_body:   JSON.stringify({ rqBody: collBody }),
    create_owner_body:        JSON.stringify({ rqBody: ownerBody }),

    // ── Values to report back to leader
    planned_aprs_value:    aprsValue,
    planned_contract_date: contractDate
  });

  // ── TRACKING ROW ───────────────────────────────────────────────────────────
  trackingRows.push({
    seq,
    description:    `${collTypeRaw.split(' - ')[0].trim()} | ${rawBotStr.split(' - ')[0].trim()} | ${row[4]}`,
    grade,
    cif_existing:   existingCIF || '',
    coll_id_existing: existingCollId || '',
    planned_aprs_value: aprsValue,
    planned_contract_date: contractDate,
    // These 3 will be filled after running in Postman
    actual_cif:      '',
    actual_coll_id:  '',
    actual_aprs_value: ''
  });

  idx++;
  if (idx % 100 === 0) process.stdout.write(`  ✓ ${idx} rows processed...\r`);
}

// ─── WRITE OUTPUTS ───────────────────────────────────────────────────────────
const postmanPath  = path.join(OUTPUT_DIR, 'postman-data.json');
const trackingPath = path.join(OUTPUT_DIR, 'tracking-sheet.csv');

fs.writeFileSync(postmanPath, JSON.stringify(postmanData, null, 2), 'utf-8');

const csvHeader = 'Seq,Description,Grade,CIF (existing),COLL_ID (existing),Planned Aprs Value,Planned Contract Date,Actual CIF (from API),Actual COLL_ID (from API),Actual Aprs Value';
const csvLines  = trackingRows.map(r =>
  [r.seq, `"${r.description}"`, r.grade,
   r.cif_existing, r.coll_id_existing,
   r.planned_aprs_value, r.planned_contract_date,
   r.actual_cif, r.actual_coll_id, r.actual_aprs_value].join(',')
);
fs.writeFileSync(trackingPath, [csvHeader, ...csvLines].join('\n'), 'utf-8');

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n✅  Done!\n`);
console.log(`📊  Results:`);
console.log(`    Total rows in CSV      : ${rows.length}`);
console.log(`    Generated (all types)  : ${postmanData.length}`);
console.log(`    Skipped (Type 4 - bank): ${skipped.length}`);
console.log(`\n📁  Output files:`);
console.log(`    ${postmanPath}`);
console.log(`    ${trackingPath}`);

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌  POSTMAN SETUP — copy these scripts into Postman
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Postman collection needs 4 requests in this order:
  1. Create Customer  (POST /v1/customers/personal/create  OR  /corporate/create)
  2. Create Registration  (POST /v1/customers/registration/create)
  3. Create Collateral  (POST /v1/collaterals/create)
  4. Create Collateral Owner  (POST /v1/collateral-owners/create)

── Request 1 · PRE-REQUEST SCRIPT ──────────────────
const apiType = pm.iterationData.get("customer_api_type");
const body    = JSON.parse(pm.iterationData.get("create_customer_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
const baseUrl = pm.environment.get("base_url");
pm.request.url = apiType === "personal"
  ? baseUrl + "/v1/customers/personal/create"
  : baseUrl + "/v1/customers/corporate/create";

── Request 1 · TEST SCRIPT ─────────────────────────
const res = pm.response.json();
// ⚠️  Adjust the path below to match your API response
const cif = res?.data?.customer_id || res?.customerId || res?.cif || "";
pm.environment.set("current_cif", cif);
pm.test("Customer created", () => pm.expect(cif).to.not.be.empty);

── Request 2 · PRE-REQUEST SCRIPT ──────────────────
let body = JSON.parse(pm.iterationData.get("create_registration_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });

── Request 2 · TEST SCRIPT ─────────────────────────
pm.test("Registration created", () => pm.response.to.have.status(200));

── Request 3 · PRE-REQUEST SCRIPT ──────────────────
const body = JSON.parse(pm.iterationData.get("create_collateral_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });

── Request 3 · TEST SCRIPT ─────────────────────────
const res = pm.response.json();
// ⚠️  Adjust the path below to match your API response
const collId = res?.data?.coll_id || res?.collId || res?.id || "";
pm.environment.set("current_coll_id", collId);
pm.test("Collateral created", () => pm.expect(collId).to.not.be.empty);

── Request 4 · PRE-REQUEST SCRIPT ──────────────────
let body = JSON.parse(pm.iterationData.get("create_owner_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
body.rqBody.coll_id     = pm.environment.get("current_coll_id");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });

── Request 4 · TEST SCRIPT (collect results) ────────
const cif      = pm.environment.get("current_cif");
const collId   = pm.environment.get("current_coll_id");
const aprs     = pm.iterationData.get("planned_aprs_value");
const contract = pm.iterationData.get("planned_contract_date");
const seq      = pm.iterationData.get("seq");

// Accumulate all results in environment variable
let results = JSON.parse(pm.environment.get("run_results") || "[]");
results.push({ seq, cif, coll_id: collId, aprs_value: aprs, contract_date: contract });
pm.environment.set("run_results", JSON.stringify(results));
pm.test("Owner created", () => pm.response.to.have.status(200));

── After running: get results ───────────────────────
In Postman → Environments → copy the value of "run_results"
Paste into a JSON-to-CSV converter to get your leader's report.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
