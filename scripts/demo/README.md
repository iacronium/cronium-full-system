# Demo Scripts - Quick Reference

## 📁 Scripts Disponibles

### Ejecución Individual

```bash
# 1. Configurar KYC para inversores
npx hardhat run scripts/demo/1_set_kyc.js --network baseSepolia

# 2. Mintear mUSDC a inversores
npx hardhat run scripts/demo/2_mint_usdc.js --network baseSepolia

# 3. Comprar tokens de franquicia
npx hardhat run scripts/demo/3_purchase_tokens.js --network baseSepolia

# 4. Depositar dividendos
npx hardhat run scripts/demo/4_deposit_dividends.js --network baseSepolia

# 5. Crear ciclo de dividendos
npx hardhat run scripts/demo/5_trigger_cycle.js --network baseSepolia

# 6. Reclamar dividendos
npx hardhat run scripts/demo/6_claim_dividends.js --network baseSepolia
```

### Ejecución Completa

```bash
# Ejecutar demo completo (todos los pasos)
npx hardhat run scripts/demo/run_full_demo.js --network baseSepolia
```

## 📋 Orden de Ejecución

1. **set_kyc** - Verifica KYC de inversores
2. **mint_usdc** - Da fondos a inversores
3. **purchase_tokens** - Inversores compran tokens
4. **deposit_dividends** - Manager deposita ganancias
5. **trigger_cycle** - Crea ciclo de distribución
6. **claim_dividends** - Inversores reclaman dividendos

## 🔗 Enlaces Útiles

- **FranchiseTokenizer**: https://sepolia.basescan.org/address/0xAb59a3e3Ae08359139D457975579dA2fdeb0ff5f
- **ComplianceManager**: https://sepolia.basescan.org/address/0x9Ea652E99B9D488e53e418726642d872824c75D4
- **DividendDistributor**: https://sepolia.basescan.org/address/0xC8e3575e66FB54d0B00237f9b17dc6e05BF8d4B1
- **MockERC20 (mUSDC)**: https://sepolia.basescan.org/address/0x70Fef40966f45fA2cdf2c241c247D806B9E24d61

## 💡 Tips

- Cada script muestra su progreso en consola
- Los hashes de transacción se muestran para verificación
- Puedes ejecutar scripts individuales para demos específicos
- El script completo toma ~5-10 minutos en ejecutar
