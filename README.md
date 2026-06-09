# BAAC CBS Collateral Test Data Generator

เครื่องมือสำหรับสร้าง Payload ทดสอบระบบ CBS ครอบคลุมหลักประกันทุกประเภท พร้อม workflow อัตโนมัติผ่าน Postman Collection Runner

---

## ไฟล์ในโปรเจกต์

| ไฟล์ | คำอธิบาย |
|---|---|
| `Generate_Json_Collateralv2.html` | HTML Generator สำหรับสร้าง payload ทีละรายการ (เปิดบน banking computer) |
| `generate-test-data.js` | Script สำหรับสร้าง payload จาก Planning CSV ทีเดียว 246 รายการ |
| `postman-data.json` | Postman iteration data ที่พร้อม import (output จาก script) |
| `tracking-sheet.csv` | ตารางสำหรับส่งหัวหน้า (CIF, coll_id, aprs_value, contract_date) |

---

## ข้อกำหนดเบื้องต้น

- **Node.js** v14+ (สำหรับรัน generate-test-data.js บน Mac)
- **Postman** (web.postman.co หรือ Desktop)
- ไฟล์ Planning CSV: `BAAC-PHOENIX-COLL-DATA2569_V.0.0.csv`

---

## ขั้นตอนการใช้งาน

### Step 1 — สร้าง Payload จาก Planning CSV

รัน script บนเครื่อง Mac:

```bash
node generate-test-data.js
```

**Output ที่ได้:**
- `postman-data.json` — 246 test cases พร้อมใช้
- `tracking-sheet.csv` — ตารางสำหรับส่งหัวหน้า

> ⚠️ **หมายเหตุ:** หลักประกันประเภท 4 (บัญชีเงินฝาก) จะถูก Skip อัตโนมัติ เนื่องจากต้องใช้เลขบัญชีจริงจากระบบธนาคาร

---

### Step 2 — โครงสร้าง Postman Collection

Collection มี **7 requests** แต่เราใช้แค่ **5 requests** (skip 4-updateCustomerRegistration และ 5-updatePersonalCustomer):

```
📁 CreateDataCBS
  ├── 1-createPersonalCustomer       POST  .../v1/customers/personal/create
  ├── 2-createCorporateCustomer      POST  .../v1/customers/corporate/create
  ├── 3-createCustomerRegistration   POST  .../v1/customers/registration/create
  ├── 4-updateCustomerRegistration   ← SKIP (ไม่ใช้ในขั้นตอนนี้)
  ├── 5-updatePersonalCustomer       ← SKIP (ไม่ใช้ในขั้นตอนนี้)
  ├── 6-createCollateral คำอธิบาย   POST  .../v1/collaterals/create
  └── 7-createCollateralOwner        POST  .../v1/collaterals/customers/create
```

**Flow ต่อ 1 iteration:**
- **Personal** (603, 600): รัน 1 → skip 2 → รัน 3 → skip 4,5 → รัน 6 → รัน 7
- **Corporate** (500, 707, 709 ฯลฯ): skip 1 → รัน 2 → รัน 3 → skip 4,5 → รัน 6 → รัน 7

> `postman.setNextRequest()` จะทำการ skip request ที่ไม่ต้องการอัตโนมัติ

ตั้งค่า Environment variable:
- `base_url` = base URL ของ banking server (เช่น `https://soagwuat.kube.baac.or.th:8543/LPSWS-cbsiuat/service`)

---

### Step 3 — ใส่ Scripts ใน Postman

คัดลอก script ด้านล่างใส่ใน **Pre-request Script** และ **Tests** ของแต่ละ request:

---

#### Request 1: `1-createPersonalCustomer`

**Pre-request Script:**
```javascript
// ถ้าเป็น corporate ให้ข้ามไป request 2 เลย
if (pm.iterationData.get("customer_api_type") !== "personal") {
    postman.setNextRequest("2-createCorporateCustomer");
    return;
}
const body = JSON.parse(pm.iterationData.get("create_customer_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Tests:**
```javascript
if (pm.iterationData.get("customer_api_type") !== "personal") return;
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const cif = res?.data?.customer_id || res?.customerId || res?.cif || "";
pm.environment.set("current_cif", cif);
pm.test("Personal Customer created", () => pm.expect(cif).to.not.be.empty);
```

---

#### Request 2: `2-createCorporateCustomer`

**Pre-request Script:**
```javascript
// ถ้าเป็น personal ให้ข้ามไป request 3 เลย
if (pm.iterationData.get("customer_api_type") !== "corporate") {
    postman.setNextRequest("3-createCustomerRegistration");
    return;
}
const body = JSON.parse(pm.iterationData.get("create_customer_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Tests:**
```javascript
if (pm.iterationData.get("customer_api_type") !== "corporate") return;
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const cif = res?.data?.customer_id || res?.customerId || res?.cif || "";
pm.environment.set("current_cif", cif);
pm.test("Corporate Customer created", () => pm.expect(cif).to.not.be.empty);
```

---

#### Request 3: `3-createCustomerRegistration`

**Pre-request Script:**
```javascript
let body = JSON.parse(pm.iterationData.get("create_registration_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Tests:**
```javascript
pm.test("Registration created", () => pm.response.to.have.status(200));
// ข้าม 4-updateCustomerRegistration และ 5-updatePersonalCustomer
postman.setNextRequest("6-createCollateral คำอธิบาย");
```

---

#### Request 6: `6-createCollateral คำอธิบาย`

**Pre-request Script:**
```javascript
const body = JSON.parse(pm.iterationData.get("create_collateral_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Tests:**
```javascript
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const collId = res?.data?.coll_id || res?.collId || res?.id || "";
pm.environment.set("current_coll_id", collId);
pm.test("Collateral created", () => pm.expect(collId).to.not.be.empty);
```

---

#### Request 7: `7-createCollateralOwner`

**Pre-request Script:**
```javascript
let body = JSON.parse(pm.iterationData.get("create_owner_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
body.rqBody.coll_id     = pm.environment.get("current_coll_id");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Tests:**
```javascript
const cif      = pm.environment.get("current_cif");
const collId   = pm.environment.get("current_coll_id");
const aprs     = pm.iterationData.get("planned_aprs_value");
const contract = pm.iterationData.get("planned_contract_date");
const seq      = pm.iterationData.get("seq");

// เก็บผลลัพธ์ทุก iteration ไว้ใน environment variable
let results = JSON.parse(pm.environment.get("run_results") || "[]");
results.push({ seq, cif, coll_id: collId, aprs_value: aprs, contract_date: contract });
pm.environment.set("run_results", JSON.stringify(results));

pm.test("Owner created", () => pm.response.to.have.status(200));
```

---

### Step 4 — รัน Collection Runner

1. เปิด **Postman → Collections** → เลือก collection **CreateDataCBS**
2. คลิก **Run** (Collection Runner)
3. ในหน้า Runner:
   - **Iterations**: `246`
   - **Data**: คลิก **Select File** → เลือก `postman-data.json`
4. คลิก **Run CreateDataCBS**

> Postman จะ skip request 4 และ 5 อัตโนมัติผ่าน `setNextRequest` และ chain CIF / coll_id ระหว่าง requests

---

### Step 5 — เก็บผลลัพธ์สำหรับหัวหน้า

หลังรันเสร็จ:

1. ไปที่ **Postman → Environments** → เลือก environment ที่ใช้
2. ค้นหาตัวแปร `run_results` → คัดลอก value ทั้งหมด
3. นำไป paste ใน [JSON to CSV converter](https://www.convertcsv.com/json-to-csv.htm)
4. Export เป็น CSV → นำไปรวมกับ `tracking-sheet.csv`

**ข้อมูลที่ได้สำหรับหัวหน้า:**

| Column | แหล่งที่มา |
|---|---|
| `seq` | หมายเลขลำดับจาก Planning CSV |
| `cif` | ได้จาก API response (Request 1 หรือ 2) |
| `coll_id` | ได้จาก API response (Request 6) |
| `aprs_value` | ราคาประเมินรวม (pre-generated) |
| `contract_date` | วันหมดอายุสัญญาเงินกู้ (pre-generated) |

---

## หลักประกันที่รองรับ

| Type | ประเภท | BOT Code | จำนวน Test Cases |
|---|---|---|---|
| 1 | ที่ดิน | 286003, 286006 | 30 |
| 2 | สิ่งปลูกสร้าง | 286004, 286008 | 30 |
| 3 | เครื่องจักร | 286011 | 15 |
| 4 | บัญชีเงินฝาก | — | **Skip** |
| 5 | พันธบัตร | 286018 | 50 |
| 8 | คอนโด/อาคารชุด | 286008, 286066 | 15 |
| 13 | หนังสือค้ำประกัน | 286061 | 13 |
| 14 | สลาก | 286023 | 16 |
| 17 | อสังหาริมทรัพย์อื่นๆ (ส.ป.ก.) | 286008 | 21 |
| 99 | อื่นๆ (สินค้าคงคลัง/เรือ) | 286039, 286214 | 56 |
| **รวม** | | | **246** |

---

## หมายเหตุ

- **Type 4 (บัญชีเงินฝาก)**: ต้องสร้างบัญชีจริงและฝากเงินในระบบธนาคารก่อน จึงต้องทดสอบแยกด้วยตนเอง
- **rows 1–30**: มี CIF และ coll_id กำหนดไว้แล้วใน Planning CSV (สร้างไว้ก่อนหน้า)
- **Request name ต้องตรงทุกตัวอักษร**: `postman.setNextRequest()` ใช้ชื่อ request ตรงตัว เช่น `"6-createCollateral คำอธิบาย"` (มีเว้นวรรคและภาษาไทย)
- **Response path**: ตรวจสอบ path ของ `customer_id` และ `coll_id` ใน API response จริงก่อนรัน แล้วแก้ไขใน Test Scripts ของ Request 1/2 และ 6
