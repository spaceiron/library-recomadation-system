# GitHub Connection Setup for CodePipeline

## 1. CodeStar Connections Kullanarak GitHub Bağlantısı

CodeStar Connections, GitHub webhook'larından daha güvenli ve kolay bir yöntemdir.

### AWS Console'dan Bağlantı Oluştur

1. AWS Console → Developer Tools → CodeStar → Connections
2. "Create connection" butonuna bas
3. Provider: **GitHub**
4. Connection name: `github-connection`
5. "Connect to GitHub" butonuna bas
6. GitHub'da authorize et
7. Connection ARN'ını kopyala (pipeline stack'te kullanılacak)

### Alternatif: CLI ile Bağlantı Oluştur

```bash
aws codestar-connections create-connection \
  --provider-type GitHub \
  --connection-name github-connection
```

Bu komut bir ARN döndürecek. Bu ARN'ı pipeline stack'te kullanacağız.

## 2. Pipeline Deploy Et

```bash
cd infrastructure
npm run cdk deploy MyLibraryPipelineStack
```

## 3. GitHub Connection'ı Aktifleştir

1. AWS Console → Developer Tools → CodeStar → Connections
2. Oluşturduğun connection'ı bul
3. Status "PENDING" ise, "Update pending connection" butonuna bas
4. GitHub'da authorize et
5. Status "AVAILABLE" olacak

## 4. Test Et

1. GitHub repo'na bir değişiklik push et
2. AWS Console → CodePipeline → library-app-pipeline
3. Pipeline otomatik çalışacak ve deploy edecek

## Notlar

- CodeStar Connections webhook'lardan daha güvenli
- GitHub token'a gerek yok
- Otomatik olarak webhook'ları yönetir
- Daha az hata verir
