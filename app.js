(()=>{"use strict";const body=document.body,h=document.querySelector(".hamburger"),bd=document.querySelector(".menu-backdrop"),c=document.querySelector(".close-menu");function open(){body.classList.add("menu-open")}function close(){body.classList.remove("menu-open")}h?.addEventListener("click",open);bd?.addEventListener("click",close);c?.addEventListener("click",close);document.querySelectorAll(".mobile-links a,.mobile-links button").forEach(x=>x.addEventListener("click",close));document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});const slides=[...document.querySelectorAll(".slide")],dots=document.querySelector(".dots");let i=0,t;function renderDots(){if(!dots)return;dots.innerHTML=slides.map((_,n)=>`<button type="button" data-i="${n}" aria-label="Slide ${n+1}"></button>`).join("");dots.querySelectorAll("button").forEach(b=>b.onclick=()=>{show(+b.dataset.i);start()})}function show(n){if(!slides.length)return;i=(n+slides.length)%slides.length;slides.forEach((s,k)=>s.classList.toggle("active",k===i));dots?.querySelectorAll("button").forEach((d,k)=>d.classList.toggle("active",k===i))}function next(){show(i+1)}function start(){clearInterval(t);t=setInterval(next,5500)}renderDots();show(0);start();document.querySelector(".next")?.addEventListener("click",()=>{next();start()});document.querySelector(".prev")?.addEventListener("click",()=>{show(i-1);start()});document.querySelectorAll(".login,.mobile-links button").forEach(b=>b.addEventListener("click",()=>{window.location.href="./dashboard.html#login"}));document.querySelector("form")?.addEventListener("submit",e=>{e.preventDefault();alert("Đã ghi nhận thông tin. ARTECH Robotics sẽ liên hệ lại sớm.");e.target.reset()});const top=document.querySelector(".back-top");window.addEventListener("scroll",()=>top?.classList.toggle("show",scrollY>520));top?.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}))})();

const revealItems = document.querySelectorAll('.reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    }
  });
}, {
  threshold: 0.18
});

revealItems.forEach(item => revealObserver.observe(item));
const observer = new IntersectionObserver(
(entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
},
{
    threshold: 0.2
}
);

document
.querySelectorAll(".reveal-left, .reveal-right")
.forEach(el => observer.observe(el));

document.addEventListener("DOMContentLoaded", () => {
  const vmvCards = document.querySelectorAll(".vmv-card");

  const vmvObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, {
    threshold: 0.2
  });

  vmvCards.forEach(card => vmvObserver.observe(card));
});