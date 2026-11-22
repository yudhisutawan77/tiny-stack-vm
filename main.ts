// tiny-stack-vm: a faithful interpreter for make.fun's tiny stack ISA v1.
// Runs every /input/<id>/program.bin on its input.bin and writes
// /output/<id>/stdout.bin + exit.txt. Pure: no clock, random or network,
// so two runs on the same bytes agree byte for byte.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const HALT=0x00,PUSH8=0x01,PUSH32=0x02,POP=0x03,DUP=0x04,SWAP=0x05,OVER=0x06,ROT=0x07,ADD=0x10,SUB=0x11,MUL=0x12,DIV=0x13,MOD=0x14,DIVU=0x15,MODU=0x16,NEG=0x17,AND=0x18,OR=0x19,XOR=0x1a,NOT=0x1b,SHL=0x1c,SHR=0x1d,SHRU=0x1e,EQ=0x20,LT=0x21,LTU=0x22,JMP=0x30,JZ=0x31,JNZ=0x32,CALL=0x33,RET=0x34,LOAD=0x40,STORE=0x41,PRINT=0x50,PUTC=0x51,IN=0x52,EXIT=0x53;
const enc=new TextEncoder();
function execute(prog,input){
 const n=prog.length,stk=new Int32Array(256),ret=new Int32Array(64),mem=new Int32Array(256),out=new Uint8Array(65536);
 let dp=0,rp=0,ip=0,steps=0,olen=0,ipos=0,bad;
 const finish=c=>({bytes:out.subarray(0,olen),code:c});
 const shape=(pop,push)=>dp<pop?2:dp-pop+push>256?3:0;
 for(;;){
  if(steps===1e6)return finish(10);
  if(ip<0||ip>=n)return finish(9);
  const op=prog[ip];
  if(!(op<=7||op>=0x10&&op<=0x1e||op>=0x20&&op<=0x22||op>=0x30&&op<=0x34||op>=0x40&&op<=0x41||op>=0x50&&op<=0x53))return finish(5);
  const imm=op===PUSH8?1:op===PUSH32?4:op>=JMP&&op<=CALL?2:0;
  if(ip+imm>=n)return finish(9);
  steps++;
  const nx=ip+1+imm;
  ip=nx;
  switch(op){
   case HALT:return finish(0);
   case PUSH8:if((bad=shape(0,1)))return finish(bad);stk[dp++]=(prog[nx-1]<<24)>>24;break;
   case PUSH32:if((bad=shape(0,1)))return finish(bad);stk[dp++]=prog[nx-4]|prog[nx-3]<<8|prog[nx-2]<<16|prog[nx-1]<<24;break;
   case POP:if((bad=shape(1,0)))return finish(bad);dp--;break;
   case DUP:if((bad=shape(1,2)))return finish(bad);stk[dp]=stk[dp-1];dp++;break;
   case SWAP:{if((bad=shape(2,2)))return finish(bad);const t=stk[dp-1];stk[dp-1]=stk[dp-2];stk[dp-2]=t;break;}
   case OVER:if((bad=shape(2,3)))return finish(bad);stk[dp]=stk[dp-2];dp++;break;
   case ROT:{if((bad=shape(3,3)))return finish(bad);const a=stk[dp-3];stk[dp-3]=stk[dp-2];stk[dp-2]=stk[dp-1];stk[dp-1]=a;break;}
   case NEG:if((bad=shape(1,1)))return finish(bad);stk[dp-1]=-stk[dp-1]|0;break;
   case NOT:if((bad=shape(1,1)))return finish(bad);stk[dp-1]=~stk[dp-1];break;
   case ADD:case SUB:case MUL:case DIV:case MOD:case DIVU:case MODU:case AND:case OR:case XOR:case SHL:case SHR:case SHRU:case EQ:case LT:case LTU:{
    if((bad=shape(2,1)))return finish(bad);
    const b=stk[dp-1],a=stk[dp-2];let r;
    switch(op){
     case ADD:r=a+b|0;break;
     case SUB:r=a-b|0;break;
     case MUL:r=Math.imul(a,b);break;
     case DIV:if(!b)return finish(4);r=a===-2147483648&&b===-1?a:a/b|0;break;
     case MOD:if(!b)return finish(4);r=b===-1?0:a%b|0;break;
     case DIVU:if(!b)return finish(4);r=Math.floor((a>>>0)/(b>>>0))|0;break;
     case MODU:if(!b)return finish(4);r=(a>>>0)%(b>>>0)|0;break;
     case AND:r=a&b;break;
     case OR:r=a|b;break;
     case XOR:r=a^b;break;
     case SHL:r=a<<(b&31);break;
     case SHR:r=a>>(b&31);break;
     case SHRU:r=a>>>(b&31)|0;break;
     case EQ:r=a===b?1:0;break;
     case LT:r=a<b?1:0;break;
     default:r=(a>>>0)<(b>>>0)?1:0;
    }
    dp-=2;stk[dp++]=r;break;
   }
   case JMP:{const rel=(prog[nx-2]|prog[nx-1]<<8)<<16>>16;ip=nx+rel;break;}
   case JZ:case JNZ:{
    if((bad=shape(1,0)))return finish(bad);
    const v=stk[--dp],rel=(prog[nx-2]|prog[nx-1]<<8)<<16>>16;
    if(op===JZ?v===0:v!==0)ip=nx+rel;
    break;
   }
   case CALL:if(rp===64)return finish(7);ret[rp++]=nx;ip=prog[nx-2]|prog[nx-1]<<8;break;
   case RET:if(!rp)return finish(8);ip=ret[--rp];break;
   case LOAD:{if((bad=shape(1,1)))return finish(bad);const a=stk[dp-1];if(a<0||a>255)return finish(6);stk[dp-1]=mem[a];break;}
   case STORE:{if((bad=shape(2,0)))return finish(bad);const a=stk[dp-1];if(a<0||a>255)return finish(6);mem[a]=stk[dp-2];dp-=2;break;}
   case PRINT:{if((bad=shape(1,0)))return finish(bad);const t=enc.encode(String(stk[dp-1]));if(olen+t.length>65536)return finish(11);dp--;out.set(t,olen);olen+=t.length;break;}
   case PUTC:if((bad=shape(1,0)))return finish(bad);if(olen+1>65536)return finish(11);out[olen++]=stk[--dp]&255;break;
   case IN:if((bad=shape(0,1)))return finish(bad);stk[dp++]=ipos<input.length?input[ipos++]:-1;break;
   default:if((bad=shape(1,0)))return finish(bad);return finish(stk[--dp]&255);
  }
 }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
 const r=execute(readFileSync(join(I,id,'program.bin')),readFileSync(join(I,id,'input.bin')));
 mkdirSync(join(O,id),{recursive:true});
 writeFileSync(join(O,id,'stdout.bin'),r.bytes);
 writeFileSync(join(O,id,'exit.txt'),r.code+'\n');
}
