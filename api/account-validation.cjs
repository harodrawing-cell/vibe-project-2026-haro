'use strict';
function username(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{3,19}$/.test(id)) throw new Error('아이디는 영문 소문자·숫자·밑줄 4~20자로 입력해 주세요.');
  return id;
}
function registration(data = {}) {
  const id = username(data.username);
  if (id === 'admin') throw new Error('사용할 수 없는 아이디입니다.');
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 30) throw new Error('이름은 2~30자로 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('올바른 이메일을 입력해 주세요.');
  if (email === 'admin.com@company.co.kr') throw new Error('관리자 전용 이메일은 사용할 수 없습니다.');
  if (typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 128) throw new Error('비밀번호는 6~128자로 입력해 주세요.');
  return { username: id, name, email, password: data.password };
}
module.exports = { username, registration };
